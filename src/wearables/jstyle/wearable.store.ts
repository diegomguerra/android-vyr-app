/**
 * wearable.store — Reactive global state for wearable connection.
 * Supports multiple models (X3, J5Vital) via adapter switching.
 */

import type {
  WearableDevice,
  WearableStatus,
  BiomarkerType,
  BiomarkerTypeCore,
  SyncProgress,
  BiomarkerSample,
  DeviceDiagnostics,
  WearableAdapter,
  WearableModel,
} from './wearable.types';
import { CORE_BIOMARKER_TYPES, V5_EXTENDED_TYPES, isV5ExtendedEnabled } from './wearable.types';
import { JStyleAdapter } from './JStyleAdapter';
import { JStyleV5Adapter } from './v5/JStyleV5Adapter';
import { wlog } from './wearable.telemetry';

const JSTYLE_ENABLED = import.meta.env.VITE_JSTYLE_ENABLED !== 'false';

export interface WearableState {
  status: WearableStatus;
  devices: WearableDevice[];
  connectedDevice: WearableDevice | null;
  syncProgress: Map<BiomarkerType, SyncProgress>;
  pendingSamples: Map<BiomarkerType, BiomarkerSample[]>;
  diagnostics: DeviceDiagnostics | null;
  lastSyncAt: string | null;
  selectedModel: WearableModel;
}

function createInitialState(): WearableState {
  return {
    status: 'idle',
    devices: [],
    connectedDevice: null,
    syncProgress: new Map(),
    pendingSamples: new Map(),
    diagnostics: null,
    lastSyncAt: null,
    selectedModel: 'X3',
  };
}

class WearableStore {
  private state: WearableState = createInitialState();
  private listeners = new Set<() => void>();
  private adapterX3 = new JStyleAdapter();
  private adapterV5 = new JStyleV5Adapter();

  get adapter(): WearableAdapter {
    return this.state.selectedModel === 'J5Vital' ? this.adapterV5 : this.adapterX3;
  }

  constructor() {
    if (!JSTYLE_ENABLED) return;
    this.wireAdapter(this.adapterX3);
    this.wireAdapter(this.adapterV5);
  }

  private wireAdapter(adapter: WearableAdapter) {
    adapter.on('onDeviceFound', (device) => {
      wlog('store', 'deviceFound', device.deviceId);
      if (!this.state.devices.find((d) => d.deviceId === device.deviceId)) {
        this.patch({ devices: [...this.state.devices, device] });
      }
    });

    adapter.on('onConnected', (device) => {
      wlog('store', 'connected', device.deviceId);
      this.patch({
        connectedDevice: device,
        status: 'connected',
        diagnostics: adapter.getDiagnostics(),
      });
    });

    adapter.on('onData', (type, samples) => {
      wlog('store', 'data', type, samples.length);
      const existing = this.state.pendingSamples.get(type) ?? [];
      const updated = new Map(this.state.pendingSamples);
      updated.set(type, [...existing, ...samples]);

      const progress = new Map(this.state.syncProgress);
      progress.set(type, { type, status: 'syncing', count: existing.length + samples.length });

      this.patch({ pendingSamples: updated, syncProgress: progress });
    });

    adapter.on('onSyncEnd', (type) => {
      wlog('store', 'syncEnd', type);
      const progress = new Map(this.state.syncProgress);
      progress.set(type, {
        type,
        status: 'done',
        count: this.state.pendingSamples.get(type)?.length ?? 0,
      });
      this.patch({ syncProgress: progress });
    });

    adapter.on('onError', (code, message) => {
      wlog('store', 'error', code, message);
      this.patch({ status: 'error' });
    });
  }

  // --- State access ---
  getState(): Readonly<WearableState> { return this.state; }
  static isEnabled(): boolean { return JSTYLE_ENABLED; }

  // --- Model selection ---
  selectModel(model: WearableModel) {
    if (this.state.connectedDevice) return; // can't switch while connected
    wlog('store', 'selectModel', model);
    this.patch({ selectedModel: model, devices: [], status: 'idle' });
  }

  /** Get sync types based on selected model */
  getSyncTypes(): BiomarkerType[] {
    const core: BiomarkerType[] = [...CORE_BIOMARKER_TYPES];
    if (this.state.selectedModel === 'J5Vital' && isV5ExtendedEnabled()) {
      return [...core, ...V5_EXTENDED_TYPES];
    }
    return core;
  }

  // --- Subscriptions ---
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private patch(partial: Partial<WearableState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }

  // --- Actions ---
  async scan() {
    this.patch({ devices: [], status: 'scanning' });
    await this.adapter.scan();
  }

  async stopScan() {
    await this.adapter.stopScan();
    if (this.state.status === 'scanning') this.patch({ status: 'idle' });
  }

  async connect(deviceId: string): Promise<boolean> {
    const ok = await this.adapter.connect(deviceId);
    if (!ok) this.patch({ status: 'error' });
    return ok;
  }

  async disconnect() {
    await this.adapter.disconnect();
    this.patch({ connectedDevice: null, status: 'disconnected', diagnostics: null });
  }

  async sync(options?: { since?: string }) {
    if (!this.state.connectedDevice) return;
    const types = this.getSyncTypes();
    const progress = new Map<BiomarkerType, SyncProgress>();
    types.forEach((t) => progress.set(t, { type: t, status: 'pending' }));
    this.patch({ pendingSamples: new Map(), syncProgress: progress, status: 'syncing' });
    await this.adapter.sync(options);
  }

  /** Mark flush success */
  markFlushed() {
    const now = new Date().toISOString();
    this.patch({ pendingSamples: new Map(), lastSyncAt: now });
  }

  async isAvailable(): Promise<boolean> {
    return this.adapter.isAvailable();
  }
}

// Singleton
export const wearableStore = new WearableStore();
