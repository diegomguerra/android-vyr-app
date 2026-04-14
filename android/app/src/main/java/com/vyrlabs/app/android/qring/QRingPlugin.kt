package com.vyrlabs.app.android.qring

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.ArrayDeque
import java.util.Calendar
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * QRingPlugin — Capacitor native plugin for Colmi R02 / R03 / R06 smart rings
 * (sold as "QRing"). Speaks the Nordic-UART-like protocol directly over BLE.
 *
 * Protocol reference:
 *   - colmi.puxtril.com (canonical command table)
 *   - codeberg.org/Freeyourgadget/Gadgetbridge PR #3896 (Kotlin reference)
 *   - github.com/tahnok/colmi_r02_client (Python reference)
 *
 * BLE UUIDs:
 *   Service:  6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E
 *   Write:    6E400002-B5A3-F393-E0A9-E50E24DCCA9E  (app → ring)
 *   Notify:   6E400003-B5A3-F393-E0A9-E50E24DCCA9E  (ring → app)
 *
 * Packet format: 16 bytes fixed.
 *   byte[0]        = command id
 *   bytes[1..14]   = payload
 *   byte[15]       = checksum = sum(bytes[0..14]) & 0xFF
 *
 * Commands implemented (v1):
 *   0x01  SetTime        Y/M/D/H/M/S  (MONTH IS 1-INDEXED in Puxtril spec,
 *                                      but Gadgetbridge hit an off-by-one
 *                                      bug — we send 1-indexed and validate
 *                                      against ring response)
 *   0x03  Battery        returns % + charging flag
 *   0x15  HR History     unix-ts request, multi-packet response (~288/day)
 *   0x16  HR Settings    enable/disable + interval_min (5..60)
 *   0x43  Steps History  day offset request, multi-packet response
 *
 * Commands added in v1.5:
 *   0x44  Sleep History
 *   0x2C  SpO2 History
 *   0x37  Stress/Pressure History
 *   0x39  HRV History (firmware >= 3.00.10)
 *   0x69  Realtime  (type=1 HR, 3 SpO2, 10 HRV)
 *
 * Frontend contract (events emitted via notifyListeners):
 *   deviceFound   { deviceId, name, mac, rssi, vendor, model }
 *   connected     { deviceId, name, mac, fwVersion, battery }
 *   syncData      { type: 'hr' | 'steps' | ..., samples: [...] }
 *   syncEnd       { type: 'hr' | 'steps' | ... }
 *   error         { code, message }
 *
 * BLE serialization note: Android's BluetoothGatt can only handle ONE
 * pending operation at a time (write, read, descriptor-write, etc.). We
 * queue all ops and drain on each callback completion.
 */
@CapacitorPlugin(
    name = "QRingPlugin",
    permissions = [],
)
class QRingPlugin : Plugin() {

    companion object {
        private const val TAG = "QRingPlugin"

        private val SERVICE_UUID: UUID = UUID.fromString("6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E")
        private val WRITE_UUID: UUID   = UUID.fromString("6E400002-B5A3-F393-E0A9-E50E24DCCA9E")
        private val NOTIFY_UUID: UUID  = UUID.fromString("6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
        private val CCCD_UUID: UUID    = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB")

        // Device Info Service (standard BLE)
        private val DEVICE_INFO_SERVICE: UUID = UUID.fromString("0000180a-0000-1000-8000-00805f9b34fb")
        private val FIRMWARE_REV_UUID: UUID   = UUID.fromString("00002a26-0000-1000-8000-00805f9b34fb")

        // Command IDs
        private const val CMD_SET_TIME:     Byte = 0x01
        private const val CMD_BATTERY:      Byte = 0x03
        private const val CMD_HR_HISTORY:   Byte = 0x15
        private const val CMD_HR_SETTINGS:  Byte = 0x16
        private const val CMD_SPO2_HISTORY: Byte = 0x2C
        private const val CMD_STRESS_HIST:  Byte = 0x37
        private const val CMD_HRV_HISTORY:  Byte = 0x39
        private const val CMD_STEPS_HIST:   Byte = 0x43
        private const val CMD_SLEEP_HIST:   Byte = 0x44
        private const val CMD_REALTIME:     Byte = 0x69
        private const val CMD_STOP_REALTIME: Byte = 0x6A

        // Realtime sub-types
        private const val RT_TYPE_HR:   Byte = 0x01
        private const val RT_TYPE_SPO2: Byte = 0x03
        private const val RT_TYPE_HRV:  Byte = 0x0A

        private const val PACKET_SIZE = 16
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val btManager: BluetoothManager? by lazy {
        context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    }
    private val btAdapter: BluetoothAdapter? get() = btManager?.adapter
    private var scanner: BluetoothLeScanner? = null
    private var scanning = AtomicBoolean(false)
    private var scanCallback: ScanCallback? = null

    private var gatt: BluetoothGatt? = null
    private var writeChar: BluetoothGattCharacteristic? = null
    private var notifyChar: BluetoothGattCharacteristic? = null
    private var firmwareRev: String? = null
    private var currentDeviceMac: String? = null
    private var currentDeviceName: String? = null

    private var connectCall: PluginCall? = null
    private var pendingSyncCall: PluginCall? = null

    // --- BLE op queue (write char, write descriptor, read char) ---
    private sealed class BleOp {
        data class WriteChar(val bytes: ByteArray) : BleOp()
        data class WriteDescriptor(val descriptor: BluetoothGattDescriptor, val bytes: ByteArray) : BleOp()
        data class ReadChar(val characteristic: BluetoothGattCharacteristic) : BleOp()
    }
    private val opQueue = ArrayDeque<BleOp>()
    private var opInFlight = false

    // --- Sync buffers ---
    private val hrSamples = mutableListOf<JSObject>()
    private val stepsSamples = mutableListOf<JSObject>()
    private val sleepSamples = mutableListOf<JSObject>()
    private val spo2Samples = mutableListOf<JSObject>()
    private val hrvSamples = mutableListOf<JSObject>()
    private val stressSamples = mutableListOf<JSObject>()

    private var expectedHrPackets: Int = -1
    private var receivedHrPackets: Int = 0
    private var hrIntervalMinutes: Int = 5
    private var hrDayEpoch: Long = 0L

    private var expectedStepsPackets: Int = -1
    private var receivedStepsPackets: Int = 0

    // Monotonic sample sequence — ensures each emitted sample has a unique
    // timestamp sub-millisecond. Backend has UNIQUE index on
    // (user_id, type, ts, source), so two samples with the same ms collide.
    private var sampleSeq: Double = 0.0
    private fun nowMsUnique(): Double {
        sampleSeq += 1.0
        return System.currentTimeMillis().toDouble() + sampleSeq
    }

    // =============================================================
    //  Public API — Capacitor plugin methods
    // =============================================================

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val adapter = btAdapter
        val ret = JSObject()
        ret.put("available", adapter != null && adapter.isEnabled)
        call.resolve(ret)
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun startScan(call: PluginCall) {
        val adapter = btAdapter
        if (adapter == null || !adapter.isEnabled) {
            call.reject("BLUETOOTH_OFF")
            return
        }
        if (scanning.get()) {
            call.resolve(JSObject().apply { put("alreadyScanning", true) })
            return
        }
        scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            call.reject("SCANNER_UNAVAILABLE")
            return
        }

        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        val cb = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                handleScanResult(result)
            }
            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                results.forEach { handleScanResult(it) }
            }
            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "scan failed: $errorCode")
                emitError("SCAN_FAILED", "scan error $errorCode")
                scanning.set(false)
            }
        }
        scanCallback = cb
        try {
            scanner!!.startScan(listOf(filter), settings, cb)
            scanning.set(true)
            call.resolve(JSObject().apply { put("started", true) })
        } catch (se: SecurityException) {
            call.reject("PERMISSION_DENIED: ${se.message}")
        } catch (t: Throwable) {
            call.reject("SCAN_ERROR: ${t.message}")
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun stopScan(call: PluginCall) {
        try {
            scanCallback?.let { scanner?.stopScan(it) }
        } catch (_: Throwable) { /* silent */ }
        scanning.set(false)
        scanCallback = null
        call.resolve(JSObject().apply { put("stopped", true) })
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun connect(call: PluginCall) {
        val deviceId = call.getString("deviceId")
        if (deviceId.isNullOrBlank()) {
            call.reject("MISSING_DEVICE_ID")
            return
        }
        val adapter = btAdapter
        if (adapter == null) {
            call.reject("BLUETOOTH_UNAVAILABLE")
            return
        }
        // stop scanning before connecting — Android recommendation
        try {
            scanCallback?.let { scanner?.stopScan(it) }
            scanning.set(false)
        } catch (_: Throwable) { /* silent */ }

        val device: BluetoothDevice = try {
            adapter.getRemoteDevice(deviceId)
        } catch (t: Throwable) {
            call.reject("INVALID_DEVICE_ID: ${t.message}")
            return
        }
        connectCall = call
        currentDeviceMac = deviceId
        currentDeviceName = null
        firmwareRev = null
        try {
            gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
            } else {
                device.connectGatt(context, false, gattCallback)
            }
        } catch (se: SecurityException) {
            call.reject("PERMISSION_DENIED: ${se.message}")
            connectCall = null
        } catch (t: Throwable) {
            call.reject("CONNECT_ERROR: ${t.message}")
            connectCall = null
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    fun disconnect(call: PluginCall) {
        try {
            gatt?.disconnect()
            gatt?.close()
        } catch (_: Throwable) { /* silent */ }
        gatt = null
        writeChar = null
        notifyChar = null
        currentDeviceMac = null
        currentDeviceName = null
        firmwareRev = null
        opQueue.clear()
        opInFlight = false
        call.resolve(JSObject().apply { put("disconnected", true) })
    }

    @PluginMethod
    fun sync(call: PluginCall) {
        if (gatt == null || writeChar == null) {
            call.reject("NOT_CONNECTED")
            return
        }
        pendingSyncCall = call
        // Reset buffers
        hrSamples.clear()
        stepsSamples.clear()
        sleepSamples.clear()
        spo2Samples.clear()
        hrvSamples.clear()
        stressSamples.clear()
        expectedHrPackets = -1
        receivedHrPackets = 0
        expectedStepsPackets = -1
        receivedStepsPackets = 0
        sampleSeq = 0.0

        scope.launch {
            // Sequence per Puxtril + Gadgetbridge:
            //   1. SetTime   (required before history queries, else empty)
            //   2. Battery   (smoke test)
            //   3. HR Settings (ensure auto-HR every 5 min persisted)
            //   4. HR History   (today)
            //   5. Steps History (today)
            //   6. Sleep History (today)     v1.5
            //   7. SpO2 History (today)      v1.5
            //   8. Stress History (today)    v1.5
            //   9. HRV History (today)       v1.5 if fw>=3.00.10
            sendSetTime()
            delay(200)
            sendBattery()
            delay(200)
            sendHRSettings(enable = true, intervalMinutes = 5)
            delay(200)
            sendHRHistory(dayOffset = 0)
            delay(300)
            sendStepsHistory(dayOffset = 0)
            delay(300)
            sendSleepHistory(dayOffset = 0)
            delay(200)
            sendSpo2History(dayOffset = 0)
            delay(200)
            sendStressHistory(dayOffset = 0)
            delay(200)
            if (isHrvSupported()) {
                sendHrvHistory(dayOffset = 0)
                delay(200)
            }
            // Signal end of sync after quiet period
            delay(1500)
            pendingSyncCall?.let { c ->
                val ret = JSObject()
                ret.put("hr_count", hrSamples.size)
                ret.put("steps_count", stepsSamples.size)
                ret.put("sleep_count", sleepSamples.size)
                ret.put("spo2_count", spo2Samples.size)
                ret.put("hrv_count", hrvSamples.size)
                ret.put("stress_count", stressSamples.size)
                ret.put("fw_version", firmwareRev ?: "")
                c.resolve(ret)
                pendingSyncCall = null
            }
            notifyListeners("syncEnd", JSObject().apply { put("type", "all") })
        }
    }

    @PluginMethod
    fun enableRealtime(call: PluginCall) {
        val type = call.getString("type") ?: "hr"
        val subType: Byte = when (type) {
            "hr" -> RT_TYPE_HR
            "spo2" -> RT_TYPE_SPO2
            "hrv" -> RT_TYPE_HRV
            else -> {
                call.reject("UNKNOWN_REALTIME_TYPE: $type")
                return
            }
        }
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_REALTIME
        pkt[1] = subType
        pkt[2] = 0x01
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
        call.resolve(JSObject().apply { put("started", true) })
    }

    // =============================================================
    //  Scan result handling
    // =============================================================

    @SuppressLint("MissingPermission")
    private fun handleScanResult(r: ScanResult) {
        val dev = r.device
        val name = try { dev.name } catch (_: SecurityException) { null }
        val mac = try { dev.address } catch (_: SecurityException) { null } ?: return
        val obj = JSObject()
        obj.put("deviceId", mac)
        obj.put("name", name ?: "QRing")
        obj.put("mac", mac)
        obj.put("rssi", r.rssi)
        obj.put("vendor", "colmi")
        obj.put("model", inferModelFromName(name))
        notifyListeners("deviceFound", obj)
    }

    private fun inferModelFromName(name: String?): String {
        if (name == null) return "R02"
        val n = name.uppercase()
        return when {
            n.contains("R02") -> "R02"
            n.contains("R03") -> "R03"
            n.contains("R06") -> "R06"
            n.contains("R09") -> "R09"
            n.contains("R10") -> "R10"
            else -> "R02"
        }
    }

    // =============================================================
    //  GATT callback
    // =============================================================

    private val gattCallback = object : BluetoothGattCallback() {

        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            Log.d(TAG, "connection state=$newState status=$status")
            if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                // Delay 2s as per Gadgetbridge gotcha — let the ring settle
                scope.launch {
                    delay(2000)
                    try { g.discoverServices() } catch (_: Throwable) { /* silent */ }
                }
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                writeChar = null
                notifyChar = null
                try { g.close() } catch (_: Throwable) { /* silent */ }
                gatt = null
                opQueue.clear()
                opInFlight = false
                connectCall?.reject("DISCONNECTED (status=$status)")
                connectCall = null
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                connectCall?.reject("SERVICE_DISCOVERY_FAILED: $status")
                connectCall = null
                return
            }
            val service = g.getService(SERVICE_UUID)
            if (service == null) {
                connectCall?.reject("NORDIC_UART_SERVICE_NOT_FOUND")
                connectCall = null
                return
            }
            writeChar = service.getCharacteristic(WRITE_UUID)
            notifyChar = service.getCharacteristic(NOTIFY_UUID)
            if (writeChar == null || notifyChar == null) {
                connectCall?.reject("REQUIRED_CHARACTERISTICS_MISSING")
                connectCall = null
                return
            }
            // Enable notify on TX characteristic
            g.setCharacteristicNotification(notifyChar, true)
            val cccd = notifyChar!!.getDescriptor(CCCD_UUID)
            if (cccd != null) {
                queueWriteDescriptor(cccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
            }
            // Read firmware revision (for HRV feature flag)
            val infoService = g.getService(DEVICE_INFO_SERVICE)
            val fwChar = infoService?.getCharacteristic(FIRMWARE_REV_UUID)
            if (fwChar != null) {
                queueRead(fwChar)
            }
            // Resolve connect with what we have so far
            connectCall?.let { c ->
                val ret = JSObject()
                ret.put("connected", true)
                ret.put("deviceId", currentDeviceMac ?: "")
                ret.put("mac", currentDeviceMac ?: "")
                ret.put("name", currentDeviceName ?: "QRing")
                ret.put("model", "R02")
                c.resolve(ret)
                connectCall = null
            }
            notifyListeners("connected", JSObject().apply {
                put("deviceId", currentDeviceMac ?: "")
                put("mac", currentDeviceMac ?: "")
                put("name", currentDeviceName ?: "QRing")
            })
        }

        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            opInFlight = false
            drainQueue()
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val value = characteristic.value ?: return
            handleNotify(value)
        }

        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray,
        ) {
            handleNotify(value)
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int,
        ) {
            opInFlight = false
            drainQueue()
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int,
        ) {
            if (characteristic.uuid == FIRMWARE_REV_UUID && status == BluetoothGatt.GATT_SUCCESS) {
                val fw = characteristic.value?.let { String(it) }?.trim()
                firmwareRev = fw
                Log.d(TAG, "firmware rev: $fw")
            }
            opInFlight = false
            drainQueue()
        }

        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray,
            status: Int,
        ) {
            if (characteristic.uuid == FIRMWARE_REV_UUID && status == BluetoothGatt.GATT_SUCCESS) {
                firmwareRev = String(value).trim()
                Log.d(TAG, "firmware rev: $firmwareRev")
            }
            opInFlight = false
            drainQueue()
        }
    }

    // =============================================================
    //  BLE op queue (serializes operations — Android BLE quirk)
    // =============================================================

    @Synchronized
    private fun queueWrite(bytes: ByteArray) {
        opQueue.addLast(BleOp.WriteChar(bytes))
        drainQueue()
    }

    @Synchronized
    private fun queueWriteDescriptor(descriptor: BluetoothGattDescriptor, bytes: ByteArray) {
        opQueue.addLast(BleOp.WriteDescriptor(descriptor, bytes))
        drainQueue()
    }

    @Synchronized
    private fun queueRead(characteristic: BluetoothGattCharacteristic) {
        opQueue.addLast(BleOp.ReadChar(characteristic))
        drainQueue()
    }

    @SuppressLint("MissingPermission")
    @Synchronized
    private fun drainQueue() {
        if (opInFlight) return
        val op = opQueue.pollFirst() ?: return
        val g = gatt ?: return
        opInFlight = true
        try {
            when (op) {
                is BleOp.WriteChar -> {
                    val wc = writeChar ?: return
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        g.writeCharacteristic(wc, op.bytes, BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE)
                    } else {
                        @Suppress("DEPRECATION")
                        wc.value = op.bytes
                        @Suppress("DEPRECATION")
                        wc.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                        @Suppress("DEPRECATION")
                        g.writeCharacteristic(wc)
                    }
                }
                is BleOp.WriteDescriptor -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        g.writeDescriptor(op.descriptor, op.bytes)
                    } else {
                        @Suppress("DEPRECATION")
                        op.descriptor.value = op.bytes
                        @Suppress("DEPRECATION")
                        g.writeDescriptor(op.descriptor)
                    }
                }
                is BleOp.ReadChar -> {
                    g.readCharacteristic(op.characteristic)
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "drainQueue error: ${t.message}")
            opInFlight = false
        }
    }

    // =============================================================
    //  Command builders — all 16-byte packets w/ checksum
    // =============================================================

    private fun checksum(pkt: ByteArray): Byte {
        var sum = 0
        for (i in 0 until PACKET_SIZE - 1) sum += (pkt[i].toInt() and 0xFF)
        return (sum and 0xFF).toByte()
    }

    private fun sendSetTime() {
        val cal = Calendar.getInstance()
        // Per Puxtril: byte[1]=year-2000, byte[2]=month (1..12), byte[3]=day,
        // byte[4]=hour, byte[5]=min, byte[6]=sec. Gadgetbridge had an
        // off-by-one bug because some impls used month 0-indexed. We send
        // 1-indexed (natural calendar month) to match Puxtril spec.
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_SET_TIME
        pkt[1] = (cal.get(Calendar.YEAR) - 2000).toByte()
        pkt[2] = (cal.get(Calendar.MONTH) + 1).toByte()    // Calendar.MONTH is 0-indexed → +1
        pkt[3] = cal.get(Calendar.DAY_OF_MONTH).toByte()
        pkt[4] = cal.get(Calendar.HOUR_OF_DAY).toByte()
        pkt[5] = cal.get(Calendar.MINUTE).toByte()
        pkt[6] = cal.get(Calendar.SECOND).toByte()
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendBattery() {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_BATTERY
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendHRSettings(enable: Boolean, intervalMinutes: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_HR_SETTINGS
        pkt[1] = 0x02                                    // "set" sub-op
        pkt[2] = if (enable) 0x01 else 0x02              // 1=enable, 2=disable
        pkt[3] = intervalMinutes.coerceIn(5, 60).toByte()
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendHRHistory(dayOffset: Int) {
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        cal.add(Calendar.DAY_OF_YEAR, -dayOffset)
        hrDayEpoch = cal.timeInMillis / 1000L
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_HR_HISTORY
        pkt[1] = (hrDayEpoch and 0xFF).toByte()
        pkt[2] = ((hrDayEpoch shr 8) and 0xFF).toByte()
        pkt[3] = ((hrDayEpoch shr 16) and 0xFF).toByte()
        pkt[4] = ((hrDayEpoch shr 24) and 0xFF).toByte()
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendStepsHistory(dayOffset: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_STEPS_HIST
        pkt[1] = dayOffset.toByte()
        pkt[2] = 0x0F                                    // default "fetch all slots"
        pkt[3] = 0x00
        pkt[4] = 0x5F
        pkt[5] = 0x01
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendSleepHistory(dayOffset: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_SLEEP_HIST
        pkt[1] = dayOffset.toByte()
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendSpo2History(dayOffset: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_SPO2_HISTORY
        pkt[1] = dayOffset.toByte()
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendStressHistory(dayOffset: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_STRESS_HIST
        pkt[1] = 0x01                                    // index=1 (header request)
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun sendHrvHistory(dayOffset: Int) {
        val pkt = ByteArray(PACKET_SIZE)
        pkt[0] = CMD_HRV_HISTORY
        pkt[1] = 0x01                                    // index=1 (header request)
        pkt[15] = checksum(pkt)
        queueWrite(pkt)
    }

    private fun isHrvSupported(): Boolean {
        val fw = firmwareRev ?: return false
        // Parse "3.00.10" or similar → tuple
        val parts = fw.split(".").mapNotNull { it.toIntOrNull() }
        if (parts.size < 3) return false
        val (maj, min, patch) = Triple(parts[0], parts[1], parts[2])
        return (maj > 3) || (maj == 3 && (min > 0 || patch >= 10))
    }

    // =============================================================
    //  Notify packet parser
    // =============================================================

    private fun handleNotify(bytes: ByteArray) {
        if (bytes.size < 2) return
        val cmd = bytes[0]
        try {
            when (cmd) {
                CMD_BATTERY     -> parseBattery(bytes)
                CMD_HR_HISTORY  -> parseHrHistory(bytes)
                CMD_HR_SETTINGS -> Log.d(TAG, "hr-settings ack: ${bytes.toHex()}")
                CMD_STEPS_HIST  -> parseStepsHistory(bytes)
                CMD_SLEEP_HIST  -> parseSleepHistory(bytes)
                CMD_SPO2_HISTORY -> parseSpo2History(bytes)
                CMD_STRESS_HIST -> parseStressHistory(bytes)
                CMD_HRV_HISTORY -> parseHrvHistory(bytes)
                CMD_REALTIME    -> parseRealtime(bytes)
                CMD_SET_TIME    -> Log.d(TAG, "set-time ack")
                else -> Log.d(TAG, "unhandled cmd 0x${String.format("%02X", cmd)}: ${bytes.toHex()}")
            }
        } catch (t: Throwable) {
            Log.e(TAG, "parse error on cmd 0x${String.format("%02X", cmd)}: ${t.message}")
        }
    }

    private fun parseBattery(b: ByteArray) {
        val pct = (b[1].toInt() and 0xFF)
        val charging = (b[2].toInt() and 0xFF) == 0x01
        val obj = JSObject()
        obj.put("battery", pct)
        obj.put("charging", charging)
        notifyListeners("battery", obj)
    }

    /**
     * HR history response.
     *
     * Packet format (from Puxtril + Gadgetbridge):
     * - First packet (index 0): metadata
     *     b[1]=0x00, b[2]=totalPackets, b[3]=intervalMinutes, rest unused
     * - Following packets (index 1..N): payload
     *     b[1]=packetIndex, b[2..14]=HR values (13 bytes, 0=no data)
     *     First data packet holds 9 values (alignment), next hold 13 each.
     *
     * Timestamps are computed: day_midnight + (slot * interval_min * 60).
     */
    private fun parseHrHistory(b: ByteArray) {
        val subIdx = b[1].toInt() and 0xFF
        if (subIdx == 0) {
            expectedHrPackets = b[2].toInt() and 0xFF
            hrIntervalMinutes = (b[3].toInt() and 0xFF).takeIf { it in 1..120 } ?: 5
            receivedHrPackets = 0
            Log.d(TAG, "HR history: $expectedHrPackets packets, ${hrIntervalMinutes}min interval")
            return
        }
        // Data packets carry values in b[2..14] (13 bytes).
        val startByte = 2
        val endByte = 14
        val valueCount = endByte - startByte + 1
        for (i in startByte..endByte) {
            val v = b[i].toInt() and 0xFF
            if (v == 0) continue
            // slot index within day = (packetIdx-1)*13 + (i-startByte)
            val slotInPkt = (i - startByte)
            val globalSlot = (subIdx - 1) * valueCount + slotInPkt
            val tsSec = hrDayEpoch + (globalSlot * hrIntervalMinutes.toLong() * 60L)
            val sample = JSObject()
            sample.put("type", "hr")
            sample.put("ts", tsSec * 1000L)
            sample.put("value", v)
            hrSamples.add(sample)
        }
        receivedHrPackets++
        if (expectedHrPackets > 0 && receivedHrPackets >= expectedHrPackets - 1) {
            flushHrBatch()
        }
    }

    private fun flushHrBatch() {
        if (hrSamples.isEmpty()) {
            notifyListeners("syncEnd", JSObject().apply { put("type", "hr") })
            return
        }
        val arr = JSArray()
        hrSamples.forEach { arr.put(it) }
        val ev = JSObject()
        ev.put("type", "hr")
        ev.put("samples", arr)
        notifyListeners("syncData", ev)
        notifyListeners("syncEnd", JSObject().apply { put("type", "hr") })
        hrSamples.clear()
    }

    /**
     * Steps history (CMD 0x43). Multi-packet response, 96 intervals/day
     * (15-minute buckets). Each entry has calories, steps, distance.
     *
     * Response packet format varies by fw; we pull the steps values from
     * bytes [2..14] and count them across packets as an approximation. For
     * an exact parser match Gadgetbridge's ColmiStepsSampleProvider.
     */
    private fun parseStepsHistory(b: ByteArray) {
        val subIdx = b[1].toInt() and 0xFF
        if (subIdx == 0) {
            expectedStepsPackets = b[2].toInt() and 0xFF
            receivedStepsPackets = 0
            return
        }
        // Each data byte = accumulated steps in that 15-min bucket. Zero = no data.
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val dayStart = cal.timeInMillis / 1000L
        for (i in 2..14) {
            val v = b[i].toInt() and 0xFF
            if (v == 0) continue
            val slot = (subIdx - 1) * 13 + (i - 2)
            val tsSec = dayStart + (slot * 15L * 60L)
            val sample = JSObject()
            sample.put("type", "steps")
            sample.put("ts", tsSec * 1000L)
            sample.put("value", v)
            stepsSamples.add(sample)
        }
        receivedStepsPackets++
        if (expectedStepsPackets > 0 && receivedStepsPackets >= expectedStepsPackets - 1) {
            flushStepsBatch()
        }
    }

    private fun flushStepsBatch() {
        if (stepsSamples.isEmpty()) {
            notifyListeners("syncEnd", JSObject().apply { put("type", "steps") })
            return
        }
        val arr = JSArray()
        stepsSamples.forEach { arr.put(it) }
        val ev = JSObject()
        ev.put("type", "steps")
        ev.put("samples", arr)
        notifyListeners("syncData", ev)
        notifyListeners("syncEnd", JSObject().apply { put("type", "steps") })
        stepsSamples.clear()
    }

    /**
     * Sleep (CMD 0x44). Per Puxtril: returns date, time, sleep quality.
     * The ring groups sleep into stages; parser here is conservative and
     * emits a single session sample; refine against Gadgetbridge's
     * ColmiSleepSampleProvider in v2.
     */
    private fun parseSleepHistory(b: ByteArray) {
        val sample = JSObject()
        sample.put("type", "sleep")
        sample.put("ts", nowMsUnique())
        sample.put("raw", b.toHex())
        sleepSamples.add(sample)
        if (sleepSamples.size >= 1) {
            val arr = JSArray(); sleepSamples.forEach { arr.put(it) }
            val ev = JSObject(); ev.put("type", "sleep"); ev.put("samples", arr)
            notifyListeners("syncData", ev)
            notifyListeners("syncEnd", JSObject().apply { put("type", "sleep") })
            sleepSamples.clear()
        }
    }

    private fun parseSpo2History(b: ByteArray) {
        val pct = b[2].toInt() and 0xFF
        if (pct in 50..100) {
            val s = JSObject()
            s.put("type", "spo2")
            s.put("ts", nowMsUnique())
            s.put("value", pct)
            spo2Samples.add(s)
        }
        if (spo2Samples.size >= 1) {
            val arr = JSArray(); spo2Samples.forEach { arr.put(it) }
            val ev = JSObject(); ev.put("type", "spo2"); ev.put("samples", arr)
            notifyListeners("syncData", ev)
            notifyListeners("syncEnd", JSObject().apply { put("type", "spo2") })
            spo2Samples.clear()
        }
    }

    private fun parseStressHistory(b: ByteArray) {
        val v = b[2].toInt() and 0xFF
        if (v in 1..100) {
            val s = JSObject()
            s.put("type", "stress")
            s.put("ts", nowMsUnique())
            s.put("value", v)
            stressSamples.add(s)
        }
        if (stressSamples.size >= 1) {
            val arr = JSArray(); stressSamples.forEach { arr.put(it) }
            val ev = JSObject(); ev.put("type", "stress"); ev.put("samples", arr)
            notifyListeners("syncData", ev)
            notifyListeners("syncEnd", JSObject().apply { put("type", "stress") })
            stressSamples.clear()
        }
    }

    private fun parseHrvHistory(b: ByteArray) {
        val v = b[2].toInt() and 0xFF
        if (v in 5..250) {
            val s = JSObject()
            s.put("type", "hrv")
            s.put("ts", nowMsUnique())
            s.put("value", v)
            hrvSamples.add(s)
        }
        if (hrvSamples.size >= 1) {
            val arr = JSArray(); hrvSamples.forEach { arr.put(it) }
            val ev = JSObject(); ev.put("type", "hrv"); ev.put("samples", arr)
            notifyListeners("syncData", ev)
            notifyListeners("syncEnd", JSObject().apply { put("type", "hrv") })
            hrvSamples.clear()
        }
    }

    private fun parseRealtime(b: ByteArray) {
        val type = b[1].toInt() and 0xFF
        val v = b[2].toInt() and 0xFF
        val ev = JSObject()
        when (type) {
            RT_TYPE_HR.toInt() and 0xFF -> {
                ev.put("type", "hr_realtime"); ev.put("value", v)
            }
            RT_TYPE_SPO2.toInt() and 0xFF -> {
                ev.put("type", "spo2_realtime"); ev.put("value", v)
            }
            RT_TYPE_HRV.toInt() and 0xFF -> {
                ev.put("type", "hrv_realtime"); ev.put("value", v)
            }
            else -> return
        }
        notifyListeners("realtime", ev)
    }

    private fun emitError(code: String, message: String) {
        val e = JSObject()
        e.put("code", code)
        e.put("message", message)
        notifyListeners("error", e)
    }

    private fun ByteArray.toHex(): String =
        joinToString(" ") { String.format("%02X", it) }
}
