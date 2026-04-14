/**
 * qring-bridge — TypeScript contract for the native QRingPlugin (Capacitor).
 * Speaks directly to Colmi R02/R03/R06 rings over BLE.
 *
 * Native implementations:
 *   Android: android/app/src/main/java/com/vyrlabs/app/android/qring/QRingPlugin.kt
 *   iOS:     ios/App/App/QRingPlugin.swift (phase 3)
 */

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface QRingDeviceFoundEvent {
  deviceId: string;
  name: string;
  mac: string;
  rssi: number;
  vendor: string;
  model: string;
}

export interface QRingConnectedEvent {
  deviceId: string;
  name: string;
  mac: string;
}

export interface QRingSyncDataEvent {
  type: 'hr' | 'rhr' | 'steps' | 'sleep' | 'spo2' | 'hrv' | 'stress';
  samples: Array<{
    type: string;
    ts: number;                 // unix ms
    end_ts?: number | null;
    value?: number | null;
    raw?: string;
  }>;
}

export interface QRingSyncEndEvent {
  type: string;
}

export interface QRingBatteryEvent {
  battery: number;              // 0..100
  charging: boolean;
}

export interface QRingRealtimeEvent {
  type: 'hr_realtime' | 'spo2_realtime' | 'hrv_realtime';
  value: number;
}

export interface QRingErrorEvent {
  code: string;
  message: string;
}

export interface QRingPluginInterface {
  isAvailable(): Promise<{ available: boolean }>;

  startScan(): Promise<{ started?: boolean; alreadyScanning?: boolean }>;
  stopScan():  Promise<{ stopped: boolean }>;

  connect(opts: { deviceId: string }): Promise<{
    connected: boolean;
    deviceId: string;
    name?: string;
    mac?: string;
    model?: string;
  }>;
  disconnect(): Promise<{ disconnected: boolean }>;

  sync(opts?: { since?: string; dayOffset?: number }): Promise<{
    hr_count: number;
    steps_count: number;
    sleep_count: number;
    spo2_count: number;
    hrv_count: number;
    stress_count: number;
    fw_version: string;
  }>;

  enableRealtime(opts: { type: 'hr' | 'spo2' | 'hrv' }): Promise<{ started: boolean }>;

  addListener(eventName: 'deviceFound', cb: (ev: QRingDeviceFoundEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'connected', cb: (ev: QRingConnectedEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'syncData', cb: (ev: QRingSyncDataEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'syncEnd', cb: (ev: QRingSyncEndEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'battery', cb: (ev: QRingBatteryEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'realtime', cb: (ev: QRingRealtimeEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'error', cb: (ev: QRingErrorEvent) => void): Promise<PluginListenerHandle>;
  addListener(eventName: string, cb: (...args: unknown[]) => void): Promise<PluginListenerHandle>;
}

export const QRingPlugin = registerPlugin<QRingPluginInterface>('QRingPlugin');
