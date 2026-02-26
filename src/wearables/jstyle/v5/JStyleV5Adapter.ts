/**
 * JStyleV5Adapter — Production adapter for J-Style J5Vital bracelet (SDK V5).
 * Same BLE UUIDs as X3 (FFF0/FFF6/FFF7), different SDK classes.
 * Delegates ALL BLE to native Capacitor plugin `JStyleV5Plugin`.
 */

import type {
  WearableAdapter,
  WearableDevice,
  WearableEvents,
  BiomarkerType,
  BiomarkerSample,
  DeviceDiagnostics,
} from '../wearable.types';

type EventMap = { [K in keyof WearableEvents]: Set<WearableEvents[K]> };

export class JStyleV5Adapter implements WearableAdapter {
  private events: EventMap = {
    onDeviceFound: new Set(),
    onConnected: new Set(),
    onData: new Set(),
    onSyncEnd: new Set(),
    onError: new Set(),
  };

  private connectedDevice: WearableDevice | null = null;
  private _diagnostics: DeviceDiagnostics | null = null;

  private get plugin(): any {
    return (window as any).Capacitor?.Plugins?.JStyleV5Plugin ?? null;
  }

  private get isNative(): boolean {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const r = await this.plugin?.isAvailable();
      return r?.available === true;
    } catch {
      return false;
    }
  }

  async scan(): Promise<void> {
    if (!this.isNative) {
      this.emit('onError', 'NOT_NATIVE', 'BLE scan requires native device');
      return;
    }
    try {
      this.plugin?.addListener?.('deviceFound', (d: any) => {
        const device: WearableDevice = {
          deviceId: d.deviceId,
          name: d.name ?? 'J5Vital',
          mac: d.mac,
          rssi: d.rssi,
          vendor: 'jstyle',
          model: 'J5Vital',
        };
        this.emit('onDeviceFound', device);
      });
      await this.plugin?.startScan();
    } catch (e: any) {
      this.emit('onError', 'SCAN_FAILED', e?.message ?? 'V5 scan failed');
    }
  }

  async stopScan(): Promise<void> {
    try { await this.plugin?.stopScan(); } catch { /* silent */ }
  }

  async connect(deviceId: string): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const r = await this.plugin?.connect({ deviceId });
      if (r?.connected) {
        this.connectedDevice = {
          deviceId,
          name: r.name ?? 'J5Vital',
          vendor: 'jstyle',
          model: r.model ?? 'J5Vital',
          mac: r.mac,
        };
        this._diagnostics = {
          deviceId,
          mac: r.mac,
          fwVersion: r.fwVersion,
          battery: r.battery,
        };
        this.emit('onConnected', this.connectedDevice);
        return true;
      }
      return false;
    } catch (e: any) {
      this.emit('onError', 'CONNECT_FAILED', e?.message ?? 'V5 connect failed');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try { await this.plugin?.disconnect(); } catch { /* silent */ }
    this.connectedDevice = null;
  }

  async sync(options?: { since?: string }): Promise<void> {
    if (!this.connectedDevice) {
      this.emit('onError', 'NOT_CONNECTED', 'No device connected');
      return;
    }
    try {
      this.plugin?.addListener?.('syncData', (ev: { type: BiomarkerType; samples: BiomarkerSample[] }) => {
        this.emit('onData', ev.type, ev.samples);
      });
      this.plugin?.addListener?.('syncEnd', (ev: { type: BiomarkerType }) => {
        this.emit('onSyncEnd', ev.type);
      });
      await this.plugin?.sync({ since: options?.since });
    } catch (e: any) {
      this.emit('onError', 'SYNC_FAILED', e?.message ?? 'V5 sync failed');
    }
  }

  async enableRealtime(type: BiomarkerType): Promise<void> {
    try { await this.plugin?.enableRealtime({ type }); }
    catch (e: any) { this.emit('onError', 'REALTIME_FAILED', e?.message ?? 'V5 realtime failed'); }
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
