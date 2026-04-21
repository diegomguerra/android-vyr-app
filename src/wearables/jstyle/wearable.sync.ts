/**
 * wearable.sync — Orchestrates flush of pending samples to backend.
 * ALL biomarker writes go through the Edge Function. NEVER direct inserts.
 */

import { supabase } from '@/integrations/supabase/client';
import { requireValidUserId } from '@/lib/auth-session';
import { wearableStore } from './wearable.store';
import { wlog, werror, nextRequestId } from './wearable.telemetry';
import type { IngestBatchPayload, IngestBatchResponse, BiomarkerSample, WearableModel } from './wearable.types';

const LS_LAST_DEVICE = 'vyr.wearable.lastDeviceId';
const LS_LAST_MODEL = 'vyr.wearable.lastModel';
const LS_LAST_NAME = 'vyr.wearable.lastDeviceName';

/**
 * Flush all pending samples to backend via ingest-biomarker-batch Edge Function.
 * Returns the response or null on failure.
 */
export async function flushSamplesToBackend(): Promise<IngestBatchResponse | null> {
  const state = wearableStore.getState();
  const device = state.connectedDevice;

  if (!device) {
    werror('sync', 'flushSamplesToBackend called without connected device');
    return null;
  }

  const allSamples: BiomarkerSample[] = [];
  state.pendingSamples.forEach((samples) => allSamples.push(...samples));

  if (allSamples.length === 0) {
    wlog('sync', 'no samples to flush');
    return null;
  }

  const requestId = nextRequestId();
  wlog('sync', `flush start [${requestId}]`, { count: allSamples.length, device: device.deviceId });

  // Ensure valid session before calling edge function
  await requireValidUserId();

  const diagnostics = wearableStore.getState().diagnostics;

  const payload: IngestBatchPayload = {
    vendor: device.vendor,
    model: device.model,
    device_uid: device.mac || device.deviceId,
    fw_version: diagnostics?.fwVersion ?? null,
    samples: allSamples,
  };

  const { data, error } = await supabase.functions.invoke('ingest-biomarker-batch', {
    body: payload,
  });

  if (error) {
    werror('sync', `flush failed [${requestId}]`, error.message);
    return null;
  }

  const result = data as IngestBatchResponse;
  wlog('sync', `flush done [${requestId}]`, {
    inserted: result.inserted,
    duplicates: result.duplicates,
    errors: result.errors,
  });

  wearableStore.markFlushed();
  return result;
}

/**
 * Persist last paired wearable so admin-triggered syncs can best-effort reconnect.
 * Call after a successful connect.
 */
export function rememberPairedWearable(deviceId: string, model: WearableModel, name?: string): void {
  try {
    localStorage.setItem(LS_LAST_DEVICE, deviceId);
    localStorage.setItem(LS_LAST_MODEL, model);
    if (name) localStorage.setItem(LS_LAST_NAME, name);
  } catch { /* noop */ }
}

export function forgetPairedWearable(): void {
  try {
    localStorage.removeItem(LS_LAST_DEVICE);
    localStorage.removeItem(LS_LAST_MODEL);
    localStorage.removeItem(LS_LAST_NAME);
  } catch { /* noop */ }
}

export function getLastPairedWearable(): { deviceId: string; model: WearableModel; name: string | null } | null {
  try {
    const id = localStorage.getItem(LS_LAST_DEVICE);
    const model = localStorage.getItem(LS_LAST_MODEL) as WearableModel | null;
    if (!id || !model) return null;
    return { deviceId: id, model, name: localStorage.getItem(LS_LAST_NAME) };
  } catch {
    return null;
  }
}

/**
 * Run a full wearable sync (JStyle X3/V5 or QRing) if a ring/band is paired.
 * Best-effort: silently skips if no device, reconnect fails, or BLE unavailable.
 */
export async function runWearableSyncIfPaired(): Promise<{
  ran: boolean;
  reason?: string;
  model?: WearableModel;
  inserted?: number;
  duplicates?: number;
  errors?: number;
}> {
  const available = await wearableStore.isAvailable().catch(() => false);
  if (!available) return { ran: false, reason: 'ble_unavailable' };

  let connected = wearableStore.getState().connectedDevice;
  let model = wearableStore.getState().selectedModel;

  // Try to restore last paired device if nothing connected
  if (!connected) {
    const last = getLastPairedWearable();
    if (!last) return { ran: false, reason: 'no_paired_device' };

    // Switch to the right adapter before reconnecting
    if (wearableStore.getState().selectedModel !== last.model) {
      wearableStore.selectModel(last.model);
      model = last.model;
    }

    wlog('sync', 'Wearable not connected — attempting reconnect', { deviceId: last.deviceId, model: last.model });
    const ok = await wearableStore.connect(last.deviceId).catch(() => false);
    if (!ok) return { ran: false, reason: 'reconnect_failed', model };
    connected = wearableStore.getState().connectedDevice;
    if (!connected) return { ran: false, reason: 'reconnect_no_state', model };
  }

  try {
    await wearableStore.sync();
  } catch (e: any) {
    werror('sync', 'Wearable sync threw', e?.message ?? String(e));
    return { ran: true, model, reason: 'sync_exception', inserted: 0, duplicates: 0, errors: 1 };
  }

  const r = await flushSamplesToBackend();
  if (!r) return { ran: true, model, reason: 'no_samples_or_flush_failed', inserted: 0, duplicates: 0, errors: 0 };

  return {
    ran: true,
    model,
    inserted: r.inserted ?? 0,
    duplicates: r.duplicates ?? 0,
    errors: r.errors ?? 0,
  };
}
