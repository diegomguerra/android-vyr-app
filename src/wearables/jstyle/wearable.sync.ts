/**
 * wearable.sync — Orchestrates flush of pending samples to backend.
 * ALL biomarker writes go through the Edge Function. NEVER direct inserts.
 */

import { supabase } from '@/integrations/supabase/client';
import { requireValidUserId } from '@/lib/auth-session';
import { wearableStore } from './wearable.store';
import { wlog, werror, nextRequestId } from './wearable.telemetry';
import type { IngestBatchPayload, IngestBatchResponse, BiomarkerSample } from './wearable.types';

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
