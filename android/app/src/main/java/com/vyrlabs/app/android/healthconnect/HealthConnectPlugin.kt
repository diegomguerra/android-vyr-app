package com.vyrlabs.app.android.healthconnect

import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.time.Instant

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val TAG = "HealthConnectPlugin"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private fun getClient() = HealthConnectClient.getOrCreate(context)

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        try {
            val client = HealthConnectClient.getOrCreate(context)
            val ret = JSObject()
            ret.put("available", true)
            call.resolve(ret)
        } catch (e: Exception) {
            val ret = JSObject()
            ret.put("available", false)
            call.resolve(ret)
        }
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun readSteps(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(StepsRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    val s = JSObject()
                    s.put("value", r.count)
                    s.put("startDate", r.startTime.toString())
                    s.put("endDate", r.endTime.toString())
                    samples.put(s)
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readSteps error", e)
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun readHeartRate(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    for (s2 in r.samples) {
                        val s = JSObject()
                        s.put("value", s2.beatsPerMinute)
                        s.put("startDate", s2.time.toString())
                        s.put("endDate", s2.time.toString())
                        samples.put(s)
                    }
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readHeartRate error", e)
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun readRestingHeartRate(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    val s = JSObject()
                    s.put("value", r.beatsPerMinute)
                    s.put("startDate", r.time.toString())
                    s.put("endDate", r.time.toString())
                    samples.put(s)
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readRestingHeartRate error", e)
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun readHRV(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    val s = JSObject()
                    s.put("value", r.heartRateVariabilityMillis)
                    s.put("startDate", r.time.toString())
                    s.put("endDate", r.time.toString())
                    samples.put(s)
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readHRV error", e)
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun readSpO2(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    val s = JSObject()
                    s.put("value", r.percentage.value)
                    s.put("startDate", r.time.toString())
                    s.put("endDate", r.time.toString())
                    samples.put(s)
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readSpO2 error", e)
                call.reject(e.message)
            }
        }
    }

    @PluginMethod
    fun readSleep(call: PluginCall) {
        val startDate = call.getString("startDate") ?: return call.reject("missing startDate")
        val endDate = call.getString("endDate") ?: return call.reject("missing endDate")
        scope.launch {
            try {
                val client = getClient()
                val filter = TimeRangeFilter.between(Instant.parse(startDate), Instant.parse(endDate))
                val response = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, filter))
                val samples = JSArray()
                for (r in response.records) {
                    val s = JSObject()
                    s.put("value", 0)
                    s.put("startDate", r.startTime.toString())
                    s.put("endDate", r.endTime.toString())
                    samples.put(s)
                }
                val ret = JSObject()
                ret.put("samples", samples)
                call.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "readSleep error", e)
                call.reject(e.message)
            }
        }
    }
}