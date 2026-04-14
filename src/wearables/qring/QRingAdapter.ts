/**
 * QRingAdapter — Wearable adapter for Colmi R02/R03/R06 ("QRing") smart rings.
 *
 * Delegates ALL BLE to the native QRingPlugin (Swift/Kotlin). The front-end
 * never touches BLE directly. This class only translates between the native
 * event stream and the shared `WearableAdapter` contract.
 *
 * Protocol reference: colmi.puxtril.com + Gadgetbridge PR #3896
 */

import { QRingPlugin, type QRingSyncDataEvent } from './qring-bridge';
import type {
  WearableAdapter,
  WearableDevice,
  WearableEvents,
  BiomarkerType,
  BiomarkerSample,
  DeviceDiagnostics,
} from '../jstyle/wearable.types';

type EventMap = { [K in keyof WearableEvents]: Set<WearableEvents[K]> };

/**
 * Normalize native sample to shared BiomarkerSample format.
 * Native emits `ts` as unix ms, we emit ISO strings to match the rest of the
 * VYR stack (consistent with ingest-biomarker-batch edge function).
 */
function normalizeSample(raw: QRingSyncDataEvent['samples'][number]): BiomarkerSample {
  const iso = typeof raw.ts === 'number' ? new Date(raw.ts).toISOString() : String(raw.ts);
  return {
    type: raw.type as BiomarkerType,
    ts: iso,
    end_ts: raw.end_ts != null ? new Date(raw.end_ts).toISOString() : null,
    value: raw.value ?? null,
    payload: raw.raw ? { raw: raw.raw } : undefined,
    source: 'qring_ble',
  };
}

export class QRingAdapter implements WearableAdapter {
  private events: EventMap = {
    onDeviceFound: new Set(),
    onConnected: new Set(),
    onData: new Set(),
    onSyncEnd: new Set(),
    onError: new Set(),
  };

  private connectedDevice: WearableDevice | null = null;
  private _diagnostics: DeviceDiagnostics | null = null;
  private listenersBound = false;

  private get isNative(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const r = await QRingPlugin.isAvailable();
      return r?.available === true;
    } catch {
      return false;
    }
  }

  private async bindListenersOnce(): Promise<void> {
    if (this.listenersBound) return;
    this.listenersBound = true;

    await QRingPlugin.addListener('deviceFound', (d) => {
      this.emit('onDeviceFound', {
        deviceId: d.deviceId,
        name: d.name || 'QRing',
        mac: d.mac,
        rssi: d.rssi,
        vendor: d.vendor || 'colmi',
        model: d.model || 'R02',
      });
    });

    await QRingPlugin.addListener('connected', (d) => {
      const device: WearableDevice = {
        deviceId: d.deviceId,
        name: d.name || 'QRing',
        mac: d.mac,
        vendor: 'colmi',
        model: 'R02',
      };
      this.connectedDevice = device;
      this._diagnostics = { deviceId: d.deviceId, mac: d.mac };
      this.emit('onConnected', device);
    });

    await QRingPlugin.addListener('syncData', (ev) => {
      const samples = (ev.samples ?? []).map(normalizeSample);
      if (samples.length > 0) {
        this.emit('onData', ev.type as BiomarkerType, samples);
      }
    });

    await QRingPlugin.addListener('syncEnd', (ev) => {
      this.emit('onSyncEnd', ev.type as BiomarkerType);
    });

    await QRingPlugin.addListener('battery', (ev) => {
      if (this._diagnostics) {
        this._diagnostics = { ...this._diagnostics, battery: ev.battery };
      }
    });

    await QRingPlugin.addListener('error', (ev) => {
      this.emit('onError', ev.code || 'QRING_ERROR', ev.message || 'unknown');
    });
  }

  async scan(): Promise<void> {
    if (!this.isNative) {
      this.emit('onError', 'NOT_NATIVE', 'BLE scan requires native device');
      return;
    }
    try {
      await this.bindListenersOnce();
      await QRingPlugin.startScan();
    } catch (e: any) {
      this.emit('onError', 'SCAN_FAILED', e?.message ?? 'Scan failed');
    }
  }

  async stopScan(): Promise<void> {
    try { await QRingPlugin.stopScan(); } catch { /* silent */ }
  }

  async connect(deviceId: string): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      await this.bindListenersOnce();
      const r = await QRingPlugin.connect({ deviceId });
      if (r?.connected) {
        this.connectedDevice = {
          deviceId,
          name: r.name ?? 'QRing',
          vendor: 'colmi',
          model: r.model ?? 'R02',
          mac: r.mac ?? deviceId,
        };
        this._diagnostics = {
          deviceId,
          mac: r.mac ?? deviceId,
        };
        this.emit('onConnected', this.connectedDevice);
        return true;
      }
      return false;
    } catch (e: any) {
      this.emit('onError', 'CONNECT_FAILED', e?.message ?? 'Connect failed');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try { await QRingPlugin.disconnect(); } catch { /* silent */ }
    this.connectedDevice = null;
    this._diagnostics = null;
  }

  async sync(options?: { since?: string }): Promise<void> {
    if (!this.connectedDevice) {
      this.emit('onError', 'NOT_CONNECTED', 'No device connected');
      return;
    }
    try {
      await this.bindListenersOnce();
      const r = await QRingPlugin.sync({ since: options?.since });
      if (r?.fw_version && this._diagnostics) {
        this._diagnostics = { ...this._diagnostics, fwVersion: r.fw_version };
      }
      this.emit('onSyncEnd', 'hr' as BiomarkerType);
    } catch (e: any) {
      this.emit('onError', 'SYNC_FAILED', e?.message ?? 'Sync failed');
    }
  }

  async enableRealtime(type: BiomarkerType): Promise<void> {
    if (type !== 'hr' && type !== 'spo2' && type !== 'hrv') {
      this.emit('onError', 'REALTIME_UNSUPPORTED_TYPE', `QRing realtime not available for ${type}`);
      return;
    }
    try {
      await QRingPlugin.enableRealtime({ type });
    } catch (e: any) {
      this.emit('onError', 'REALTIME_FAILED', e?.message ?? 'Realtime failed');
    }
  }

  getDiagnostics(): DeviceDiagnostics | null { return this._diagnostics; }

  on<K extends keyof WearableEvents>(event: K, handler: WearableEvents[K]): void {
    (this.events[event] as Set<any>).add(handler);
  }

  off<K extends keyof WearableEvents>(event: K, handler: WearableEvents[K]): void {
    (this.events[event] as Set<any>).delete(handler);
  }

  private emit<K extends keyof WearableEvents>(event: K, ...args: Parameters<WearableEvents[K]>): void {
    (this.events[event] as Set<any>).forEach((fn: any) => {
      try { fn(...args); } catch { /* swallow */ }
    });
  }
}
