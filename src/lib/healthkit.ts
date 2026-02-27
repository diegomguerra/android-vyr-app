/**
 * healthkit.ts
 * Ponto de entrada único para integrações de saúde.
 *
 * iOS  → @capgo/capacitor-health + VYRHealthBridge (Swift nativo)
 * Android → capacitor-health by mley (Health Connect nativo)
 *
 * A API pública (isHealthKitAvailable, requestHealthKitPermissions, etc.)
 * é mantida para compatibilidade com o restante do app.
 */

import { forceRefreshSession, requireValidUserId, retryOnAuthErrorLabeled } from './auth-session';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getPlatform } from './health-provider';
import type { IHealthProvider, SleepSample } from './health-provider';

// ─── Lazy singleton do provider ──────────────────────────────────────────────

let _provider: IHealthProvider | null = null;

async function getProvider(): Promise<IHealthProvider> {
  if (_provider) return _provider;

  const platform = getPlatform();
  if (platform === 'android') {
    const { AndroidHealthProvider } = await import('./health-android');
    _provider = new AndroidHealthProvider();
  } else if (platform === 'ios') {
    const { IOSHealthProvider } = await import('./health-ios');
    _provider = new IOSHealthProvider();
  } else {
    _provider = createNoopProvider();
  }

  return _provider;
}

// ─── Constantes (mantidas por compatibilidade) ───────────────────────────────

export const HEALTH_READ_TYPES = ['heartRate', 'sleep', 'steps'] as const;
export const BRIDGE_READ_TYPES = ['restingHeartRate', 'heartRateVariability', 'oxygenSaturation', 'respiratoryRate'] as const;
export const BRIDGE_ONLY_WRITE_TYPES = ['bodyTemperature', 'vo2Max', 'activeEnergyBurned', 'bloodPressureSystolic', 'bloodPressureDiastolic'] as const;

// ─── Controle de sync ─────────────────────────────────────────────────────────

const ANCHOR_PREFIX = 'health.anchor.';
const SYNC_DEBOUNCE_MS = 1500;
let syncLock = false;
let syncDebounce: ReturnType<typeof setTimeout> | null = null;

export type HealthAuthorizationStatus = 'notDetermined' | 'sharingDenied' | 'sharingAuthorized' | 'unknown';

// ─── API pública ──────────────────────────────────────────────────────────────

export async function isHealthKitAvailable(): Promise<boolean> {
  try {
    const provider = await getProvider();
    const available = await provider.isAvailable();
    console.log('[healthkit] isAvailable:', available, '| platform:', getPlatform());
    return available;
  } catch (e) {
    console.error('[healthkit] isAvailable THREW:', e);
    return false;
  }
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  try {
    const provider = await getProvider();
    const granted = await provider.requestPermissions();
    console.info('[healthkit] permissions requested, granted:', granted);
    await forceRefreshSession();
    return granted;
  } catch (e) {
    console.error('[healthkit] Permission request failed:', e);
    await forceRefreshSession();
    return false;
  }
}

export async function writeHealthSample(
  dataType: string,
  value: number,
  startDate: string,
  endDate?: string,
): Promise<boolean> {
  try {
    const provider = await getProvider();
    switch (dataType) {
      case 'bodyTemperature':
        return provider.writeBodyTemperature(value, startDate, endDate);
      case 'vo2Max':
        return provider.writeVO2Max(value, startDate, endDate);
      case 'activeEnergyBurned':
        return provider.writeActiveEnergyBurned(value, startDate, endDate);
      default:
        console.warn('[healthkit] writeHealthSample: tipo não suportado:', dataType);
        return false;
    }
  } catch (error) {
    console.error('[healthkit] write sample failed', { dataType, error });
    return false;
  }
}

export async function writeBloodPressure(
  systolic: number,
  diastolic: number,
  startDate: string,
  endDate?: string,
): Promise<boolean> {
  try {
    const provider = await getProvider();
    return provider.writeBloodPressure(systolic, diastolic, startDate, endDate);
  } catch (error) {
    console.error('[healthkit] write blood pressure failed', error);
    return false;
  }
}

// ─── Background sync (iOS-only via VYRHealthBridge) ──────────────────────────

let observerListenerBound = false;

export async function enableHealthKitBackgroundSync(): Promise<void> {
  if (getPlatform() !== 'ios') {
    console.log('[healthkit] background sync: skipped (not iOS)');
    return;
  }

  try {
    const { VYRHealthBridge } = await import('./healthkit-bridge');
    const ALL_TYPES = [...HEALTH_READ_TYPES, ...BRIDGE_READ_TYPES, ...BRIDGE_ONLY_WRITE_TYPES];
    for (const type of ALL_TYPES) {
      await VYRHealthBridge.enableBackgroundDelivery({ type, frequency: 'hourly' });
    }
    await VYRHealthBridge.registerObserverQueries({ types: ALL_TYPES.map(String) });

    if (!observerListenerBound) {
      observerListenerBound = true;
      await VYRHealthBridge.addListener('healthkitObserverUpdated', () => {
        void runIncrementalHealthSync('observer');
      });
      await VYRHealthBridge.addListener('healthkitObserverError', (event) => {
        console.error('[healthkit] observer error', event);
      });
    }
  } catch (error) {
    console.error('[healthkit] enable background delivery failed', error);
  }
}

export async function runIncrementalHealthSync(trigger: 'manual' | 'observer' = 'manual'): Promise<boolean> {
  if (getPlatform() === 'web') {
    console.warn('[healthkit] skipping sync on web platform');
    return false;
  }
  if (syncLock) return false;

  if (syncDebounce) clearTimeout(syncDebounce);
  await new Promise<void>((resolve) => {
    syncDebounce = setTimeout(() => resolve(), SYNC_DEBOUNCE_MS);
  });

  syncLock = true;
  try {
    return await _syncHealthKitDataInternal();
  } catch (error) {
    console.error('[healthkit] incremental sync failed', error);
    return false;
  } finally {
    syncLock = false;
  }
}

export async function syncHealthKitData(): Promise<boolean> {
  if (syncLock) {
    console.warn('[healthkit] sync already in progress, skipping');
    return false;
  }
  syncLock = true;
  try {
    return await _syncHealthKitDataInternal();
  } catch (e) {
    console.error('[healthkit] sync exception:', e);
    return false;
  } finally {
    syncLock = false;
  }
}

// ─── Helpers públicos ─────────────────────────────────────────────────────────

export function calculateSleepQuality(samples: SleepSample[]): { durationHours: number; quality: number } {
  const validSamples = samples.filter(
    (s) => s.sleepState && s.sleepState !== 'awake' && s.sleepState !== 'inBed',
  );
  if (validSamples.length === 0) return { durationHours: 0, quality: 0 };

  let totalMs = 0;
  let deepMs = 0;
  let remMs = 0;

  for (const s of validSamples) {
    const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    totalMs += ms;
    if (s.sleepState === 'deep') deepMs += ms;
    if (s.sleepState === 'rem') remMs += ms;
  }

  if (totalMs === 0) return { durationHours: 0, quality: 0 };

  return {
    durationHours: totalMs / (1000 * 60 * 60),
    quality: Math.min(100, Math.round(((deepMs / totalMs) + (remMs / totalMs) * 2.5) * 100)),
  };
}

export function convertHRVtoScale(hrvMs: number): number {
  if (hrvMs <= 0) return 0;
  return Math.min(100, Math.round((Math.log(hrvMs) / Math.log(200)) * 100));
}

// ─── Sync interno ─────────────────────────────────────────────────────────────

function setLastSyncTimestamp(type: string, iso: string): void {
  localStorage.setItem(`${ANCHOR_PREFIX}ts.${type}`, iso);
}

async function _syncHealthKitDataInternal(): Promise<boolean> {
  const available = await isHealthKitAvailable();
  if (!available) return false;

  const userId = await requireValidUserId();
  const provider = await getProvider();

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  const startDate = yesterday.toISOString();
  const endDate = now.toISOString();

  const [
    sleepSamples,
    stepsSamples,
    rhrSamples,
    hrvSamples,
    spo2Samples,
    rrSamples,
  ] = await Promise.all([
    provider.readSleep(startDate, endDate).catch(() => []),
    provider.readSteps(startDate, endDate).catch(() => []),
    provider.readRestingHeartRate(startDate, endDate).catch(() => []),
    provider.readHRV(startDate, endDate).catch(() => []),
    provider.readSpO2(startDate, endDate).catch(() => []),
    provider.readRespiratoryRate(startDate, endDate).catch(() => []),
  ]);

  console.info('[healthkit] sync samples count', {
    sleep: sleepSamples.length,
    steps: stepsSamples.length,
    rhr: rhrSamples.length,
    hrv: hrvSamples.length,
    spo2: spo2Samples.length,
    rr: rrSamples.length,
    platform: getPlatform(),
    source: provider.getSourceProvider(),
  });

  const { durationHours, quality: sleepQuality } = calculateSleepQuality(sleepSamples);
  const totalSteps = stepsSamples.map(s => s.value).reduce((a, b) => a + b, 0);

  const numAvg = (samples: { value: number }[]): number | undefined => {
    const vals = samples.map(s => s.value).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  };

  const avgRhr = numAvg(rhrSamples);
  const avgHrv = numAvg(hrvSamples);
  const avgSpo2 = numAvg(spo2Samples);
  const avgRR = numAvg(rrSamples);

  const metrics = {
    rhr: avgRhr ? Math.round(avgRhr) : null,
    hrv_sdnn: avgHrv ? Math.round(avgHrv * 10) / 10 : null,
    hrv_index: avgHrv ? convertHRVtoScale(avgHrv) : null,
    sleep_duration_hours: Math.round(durationHours * 10) / 10,
    sleep_quality: sleepQuality,
    steps: totalSteps,
    spo2: avgSpo2 ? Math.round(avgSpo2 * 10) / 10 : null,
    respiratory_rate: avgRR ? Math.round(avgRR * 10) / 10 : null,
  };

  const sourceProvider = provider.getSourceProvider();

  const result = await retryOnAuthErrorLabeled(
    async () => {
      const res = await supabase
        .from('ring_daily_data')
        .upsert(
          [{ user_id: userId, day: today, source_provider: sourceProvider, metrics: metrics as unknown as Json }],
          { onConflict: 'user_id,day,source_provider' },
        )
        .select();
      return {
        data: res.data,
        error: res.error ? { code: (res.error as any).code, message: res.error.message } : null,
      };
    },
    { table: 'ring_daily_data', operation: 'upsert' },
  );

  if (result.error) return false;

  await retryOnAuthErrorLabeled(
    async () => {
      const res = await (supabase
        .from('user_integrations') as any)
        .upsert(
          [{ user_id: userId, provider: sourceProvider, status: 'connected', last_sync_at: new Date().toISOString() }],
          { onConflict: 'user_id,provider' },
        )
        .select();
      return {
        data: res.data,
        error: res.error ? { code: (res.error as any).code, message: res.error.message } : null,
      };
    },
    { table: 'user_integrations', operation: 'upsert' },
  );

  const nowIso = now.toISOString();
  for (const dt of [...HEALTH_READ_TYPES, ...BRIDGE_READ_TYPES]) {
    setLastSyncTimestamp(dt, nowIso);
  }

  return true;
}

// ─── Provider noop (web/fallback) ────────────────────────────────────────────

function createNoopProvider(): IHealthProvider {
  const noop = async () => false;
  return {
    isAvailable: async () => false,
    requestPermissions: async () => false,
    readSteps: async () => [],
    readHeartRate: async () => [],
    readRestingHeartRate: async () => [],
    readHRV: async () => [],
    readSpO2: async () => [],
    readRespiratoryRate: async () => [],
    readSleep: async () => [],
    writeBodyTemperature: noop,
    writeBloodPressure: async () => false,
    writeVO2Max: noop,
    writeActiveEnergyBurned: noop,
    getSourceProvider: () => 'none',
  };
}
