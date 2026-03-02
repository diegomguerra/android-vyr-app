import { forceRefreshSession, requireValidUserId, retryOnAuthErrorLabeled } from './auth-session';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getPlatform } from './health-provider';
import type { IHealthProvider, SleepSample } from './health-provider';
import { computeState } from './vyr-engine';
import type { BiometricData } from './vyr-engine';
import { calculateBaseline } from './vyr-baseline';
import { getLocalToday } from './date-utils';

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

export const HEALTH_READ_TYPES = ['heartRate', 'sleep', 'steps'] as const;
export const BRIDGE_READ_TYPES = ['restingHeartRate', 'heartRateVariability', 'oxygenSaturation', 'respiratoryRate'] as const;
export const BRIDGE_ONLY_WRITE_TYPES = ['bodyTemperature', 'vo2Max', 'activeEnergyBurned', 'bloodPressureSystolic', 'bloodPressureDiastolic'] as const;

const ANCHOR_PREFIX = 'health.anchor.';
const SYNC_DEBOUNCE_MS = 1500;
let syncLock = false;
let syncDebounce: ReturnType<typeof setTimeout> | null = null;

export type HealthAuthorizationStatus = 'notDetermined' | 'sharingDenied' | 'sharingAuthorized' | 'unknown';

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

export async function writeHealthSample(dataType: string, value: number, startDate: string, endDate?: string): Promise<boolean> {
  try {
    const provider = await getProvider();
    switch (dataType) {
      case 'bodyTemperature': return provider.writeBodyTemperature(value, startDate, endDate);
      case 'vo2Max': return provider.writeVO2Max(value, startDate, endDate);
      case 'activeEnergyBurned': return provider.writeActiveEnergyBurned(value, startDate, endDate);
      default:
        console.warn('[healthkit] writeHealthSample: tipo não suportado:', dataType);
        return false;
    }
  } catch (error) {
    console.error('[healthkit] write sample failed', { dataType, error });
    return false;
  }
}

export async function writeBloodPressure(systolic: number, diastolic: number, startDate: string, endDate?: string): Promise<boolean> {
  try {
    const provider = await getProvider();
    return provider.writeBloodPressure(systolic, diastolic, startDate, endDate);
  } catch (error) {
    console.error('[healthkit] write blood pressure failed', error);
    return false;
  }
}

export function calculateSleepQuality(samples: SleepSample[]): { durationHours: number; quality: number } {
  // Session-level samples ("asleep") give total duration
  const sessions = samples.filter((s) => s.sleepState === 'asleep');
  // Stage-level samples give quality breakdown (deep/rem/light)
  const stages = samples.filter((s) => s.sleepState && s.sleepState !== 'asleep' && s.sleepState !== 'awake' && s.sleepState !== 'inBed');

  // Duration from sessions only (avoids double-counting with stages)
  let totalMs = 0;
  for (const s of sessions) {
    const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    if (ms > 0) totalMs += ms;
  }
  if (totalMs === 0) return { durationHours: 0, quality: 0 };

  // Quality from stage breakdown if available
  let deepMs = 0, remMs = 0;
  for (const s of stages) {
    const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    if (s.sleepState === 'deep') deepMs += ms;
    if (s.sleepState === 'rem') remMs += ms;
  }

  // If no stage data, estimate 50% quality based on duration alone
  const quality = stages.length > 0
    ? Math.min(100, Math.round(((deepMs / totalMs) + (remMs / totalMs) * 2.5) * 100))
    : Math.min(100, Math.round((totalMs / (8 * 3600000)) * 50));

  console.log('[healthkit] sleep calc:', { sessions: sessions.length, stages: stages.length, totalMs, deepMs, remMs, quality });

  return {
    durationHours: totalMs / (1000 * 60 * 60),
    quality,
  };
}

export function convertHRVtoScale(hrvMs: number): number {
  if (hrvMs < 1) return 0;
  const clamped = Math.min(hrvMs, 200);
  return Math.max(0, Math.min(100, Math.round((Math.log(clamped) / Math.log(200)) * 100)));
}

/** Derive resting heart rate from general HR samples by taking the lowest 20% average */
function deriveRHR(hrSamples: { value: number }[]): number | undefined {
  const vals = hrSamples.map(s => s.value).filter(v => !isNaN(v) && v > 30 && v < 220);
  if (vals.length === 0) return undefined;
  vals.sort((a, b) => a - b);
  const count = Math.max(1, Math.floor(vals.length * 0.2));
  const lowest = vals.slice(0, count);
  return lowest.reduce((a, b) => a + b, 0) / lowest.length;
}

/** Derive pseudo-RMSSD HRV from consecutive HR samples (approximation) */
function derivePseudoHRV(hrSamples: { value: number }[]): number | undefined {
  const vals = hrSamples.map(s => s.value).filter(v => !isNaN(v) && v > 30 && v < 220);
  if (vals.length < 3) return undefined;
  // Convert BPM to RR intervals (ms), compute successive differences
  const rrIntervals = vals.map(bpm => 60000 / bpm);
  let sumSqDiff = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSqDiff += diff * diff;
  }
  const rmssd = Math.sqrt(sumSqDiff / (rrIntervals.length - 1));
  return rmssd > 0 ? Math.round(rmssd * 10) / 10 : undefined;
}

let observerListenerBound = false;

export async function enableHealthKitBackgroundSync(): Promise<void> {
  if (getPlatform() !== 'ios') return;
  try {
    const { VYRHealthBridge } = await import('./healthkit-bridge');
    const ALL_TYPES = [...HEALTH_READ_TYPES, ...BRIDGE_READ_TYPES, ...BRIDGE_ONLY_WRITE_TYPES];
    for (const type of ALL_TYPES) {
      await VYRHealthBridge.enableBackgroundDelivery({ type, frequency: 'hourly' });
    }
    await VYRHealthBridge.registerObserverQueries({ types: ALL_TYPES.map(String) });
    if (!observerListenerBound) {
      observerListenerBound = true;
      await VYRHealthBridge.addListener('healthkitObserverUpdated', () => { void runIncrementalHealthSync('observer'); });
      await VYRHealthBridge.addListener('healthkitObserverError', (event) => { console.error('[healthkit] observer error', event); });
    }
  } catch (error) {
    console.error('[healthkit] enable background delivery failed', error);
  }
}

export async function runIncrementalHealthSync(trigger: 'manual' | 'observer' = 'manual'): Promise<boolean> {
  if (getPlatform() === 'web') return false;
  if (syncLock) return false;
  if (syncDebounce) clearTimeout(syncDebounce);
  await new Promise<void>((resolve) => { syncDebounce = setTimeout(() => resolve(), SYNC_DEBOUNCE_MS); });
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
  if (syncLock) return false;
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

function setLastSyncTimestamp(type: string, iso: string): void {
  localStorage.setItem(`${ANCHOR_PREFIX}ts.${type}`, iso);
}

async function _syncHealthKitDataInternal(): Promise<boolean> {
  const available = await isHealthKitAvailable();
  if (!available) return false;
  const userId = await requireValidUserId();
  const provider = await getProvider();

  // Use local date for the day key and local midnight for the start window
  const today = getLocalToday();
  const now = new Date();
  // Start from local midnight yesterday (covers overnight sleep)
  const localMidnightYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const startDate = localMidnightYesterday.toISOString();
  const endDate = now.toISOString();

  const [sleepSamples, stepsSamples, hrSamples, rhrSamples, hrvSamples, spo2Samples, rrSamples] = await Promise.all([
    provider.readSleep(startDate, endDate).catch(() => [] as SleepSample[]),
    provider.readSteps(startDate, endDate).catch(() => []),
    provider.readHeartRate(startDate, endDate).catch(() => []),
    provider.readRestingHeartRate(startDate, endDate).catch(() => []),
    provider.readHRV(startDate, endDate).catch(() => []),
    provider.readSpO2(startDate, endDate).catch(() => []),
    provider.readRespiratoryRate(startDate, endDate).catch(() => []),
  ]);

  console.info('[healthkit] sync window:', { startDate, endDate, today });
  console.info('[healthkit] sync samples count', {
    sleep: sleepSamples.length, steps: stepsSamples.length,
    hr: hrSamples.length, rhr: rhrSamples.length, hrv: hrvSamples.length,
    spo2: spo2Samples.length, rr: rrSamples.length,
    platform: getPlatform(), source: provider.getSourceProvider(),
  });

  const { durationHours, quality: sleepQuality } = calculateSleepQuality(sleepSamples);
  const totalSteps = stepsSamples.map(s => s.value).reduce((a, b) => a + b, 0);

  // Average for biometric values (filter NaN only, allow zeros for steps)
  const bioAvg = (samples: { value: number }[], minVal = 0) => {
    const vals = samples.map(s => s.value).filter(v => !isNaN(v) && v >= minVal);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  };

  // Use dedicated metrics if available, otherwise derive from general HR samples
  const avgHr = bioAvg(hrSamples, 30);   // HR must be >= 30 bpm
  const avgRhr = bioAvg(rhrSamples, 30) ?? deriveRHR(hrSamples);
  const avgHrv = bioAvg(hrvSamples, 1) ?? derivePseudoHRV(hrSamples);  // HRV must be >= 1ms
  const avgSpo2 = bioAvg(spo2Samples, 50); // SpO2 must be >= 50%
  const avgRR = bioAvg(rrSamples, 5);      // RR must be >= 5 breaths/min

  // Derive stress level from HRV (lower HRV = higher stress, scale 0-100)
  const stressLevel = avgHrv != null ? Math.max(0, Math.min(100, Math.round(100 - convertHRVtoScale(avgHrv)))) : null;

  console.info('[healthkit] derived metrics:', { avgHr, avgRhr, avgHrv, stressLevel, avgSpo2, avgRR, durationHours, sleepQuality });

  const metrics = {
    hr_avg: avgHr ? Math.round(avgHr) : null,
    rhr: avgRhr ? Math.round(avgRhr) : null,
    hrv_sdnn: avgHrv ? Math.round(avgHrv * 10) / 10 : null,
    hrv_index: avgHrv ? convertHRVtoScale(avgHrv) : null,
    stress_level: stressLevel,
    sleep_duration_hours: Math.round(durationHours * 10) / 10,
    sleep_quality: sleepQuality,
    steps: totalSteps,
    spo2: avgSpo2 ? Math.round(avgSpo2 * 10) / 10 : null,
    respiratory_rate: avgRR ? Math.round(avgRR * 10) / 10 : null,
  };

  const sourceProvider = provider.getSourceProvider();

  // 1. Upsert ring_daily_data
  const result = await retryOnAuthErrorLabeled(async () => {
    const res = await supabase.from('ring_daily_data').upsert(
      [{ user_id: userId, day: today, source_provider: sourceProvider, metrics: metrics as unknown as Json }],
      { onConflict: 'user_id,day,source_provider' }
    ).select();
    return { data: res.data, error: res.error ? { code: (res.error as any).code, message: res.error.message } : null };
  }, { table: 'ring_daily_data', operation: 'upsert' });

  if (result.error) return false;

  // 2. Update integration status
  await retryOnAuthErrorLabeled(async () => {
    const res = await (supabase.from('user_integrations') as any).upsert(
      [{ user_id: userId, provider: sourceProvider, status: 'connected', last_sync_at: new Date().toISOString() }],
      { onConflict: 'user_id,provider' }
    ).select();
    return { data: res.data, error: res.error ? { code: (res.error as any).code, message: res.error.message } : null };
  }, { table: 'user_integrations', operation: 'upsert' });

  // 3. Auto-compute VYR state from biometric data
  try {
    const biometricData: BiometricData = {
      rhr: metrics.rhr ?? undefined,
      sleepDuration: metrics.sleep_duration_hours || undefined,
      sleepQuality: metrics.sleep_quality || undefined,
      spo2: metrics.spo2 ?? undefined,
      hrvRawMs: metrics.hrv_sdnn ?? undefined,
      hrvIndex: metrics.hrv_index ?? undefined,
      stressLevel: metrics.stress_level ?? undefined,
    };

    // Preserve existing subjective data if already in computed_states
    const { data: existing } = await (supabase
      .from('computed_states')
      .select('raw_input')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle() as any);

    const existingInput = (existing?.raw_input ?? {}) as Record<string, any>;
    const mergedData: BiometricData = {
      ...biometricData,
      subjectiveEnergy: existingInput.subjectiveEnergy,
      subjectiveClarity: existingInput.subjectiveClarity,
      subjectiveFocus: existingInput.subjectiveFocus,
      subjectiveStability: existingInput.subjectiveStability,
    };

    const baseline = await calculateBaseline();
    const vyrState = computeState(mergedData, baseline);

    console.info('[healthkit] auto-computed VYR state:', vyrState);

    await retryOnAuthErrorLabeled(async () => {
      const res = await (supabase.from('computed_states') as any).upsert(
        [{
          user_id: userId,
          day: today,
          score: vyrState.score,
          level: vyrState.level,
          phase: vyrState.phase,
          pillars: vyrState.pillars as unknown as Json,
          raw_input: mergedData as unknown as Json,
        }],
        { onConflict: 'user_id,day' }
      ).select();
      return { data: res.data, error: res.error ? { code: (res.error as any).code, message: res.error.message } : null };
    }, { table: 'computed_states', operation: 'upsert' });
  } catch (e) {
    console.error('[healthkit] auto-compute VYR state failed:', e);
  }

  const nowIso = now.toISOString();
  for (const dt of [...HEALTH_READ_TYPES, ...BRIDGE_READ_TYPES]) {
    setLastSyncTimestamp(dt, nowIso);
  }
  return true;
}

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
