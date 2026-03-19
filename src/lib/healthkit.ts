import { forceRefreshSession, requireValidUserId, retryOnAuthErrorLabeled } from './auth-session';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getPlatform } from './health-provider';
import type { IHealthProvider, SleepSample } from './health-provider';
import { computeState } from './vyr-engine';
import type { BiometricData } from './vyr-engine';
import { calculateBaseline } from './vyr-baseline';
import type { BaselineMetrics } from './vyr-baseline';
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

/**
 * Silently check if all Health Connect permissions are granted.
 * Never shows a dialog — safe for auto-reconnect and background syncs.
 */
export async function checkHealthKitPermissions(): Promise<boolean> {
  try {
    const provider = await getProvider();
    const granted = await provider.checkPermissions();
    console.info('[healthkit] permissions check (silent):', granted);
    return granted;
  } catch (e) {
    console.error('[healthkit] silent permission check failed:', e);
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
  if (samples.length === 0) return { durationHours: 0, quality: 0 };

  // Separate sleep vs awake samples
  const awakeSamples = samples.filter((s) => s.sleepState === 'awake' || s.sleepState === 'inBed');
  const sleepSamples2 = samples.filter((s) => s.sleepState && s.sleepState !== 'awake' && s.sleepState !== 'inBed');

  // Stage breakdown for quality (deep/rem/light only)
  const stages = samples.filter((s) => s.sleepState === 'deep' || s.sleepState === 'rem' || s.sleepState === 'light');
  let deepMs = 0, remMs = 0, lightMs = 0;
  for (const s of stages) {
    const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    if (s.sleepState === 'deep') deepMs += ms;
    if (s.sleepState === 'rem') remMs += ms;
    if (s.sleepState === 'light') lightMs += ms;
  }

  // Merge overlapping/adjacent intervals to get true sleep duration.
  // Many wearables (e.g. JCVital) write each sleep stage as a separate
  // overlapping SleepSessionRecord. Summing durations double-counts.
  const intervals = sleepSamples2
    .map(s => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
    .filter(i => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      // Overlapping or adjacent — extend
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }

  const totalSleepMs = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);

  // Subtract awake periods that fall within merged sleep blocks
  let awakeMs = 0;
  for (const a of awakeSamples) {
    const aStart = new Date(a.startDate).getTime();
    const aEnd = new Date(a.endDate).getTime();
    for (const block of merged) {
      const overlapStart = Math.max(aStart, block.start);
      const overlapEnd = Math.min(aEnd, block.end);
      if (overlapEnd > overlapStart) awakeMs += (overlapEnd - overlapStart);
    }
  }

  const netSleepMs = Math.max(0, totalSleepMs - awakeMs);

  console.log('[healthkit] sleep calc:', {
    totalSamples: samples.length,
    sleepSamples: sleepSamples2.length,
    awakeSamples: awakeSamples.length,
    stages: stages.length,
    mergedBlocks: merged.length,
    totalSleepMin: Math.round(totalSleepMs / 60000),
    awakeMin: Math.round(awakeMs / 60000),
    netSleepMin: Math.round(netSleepMs / 60000),
    deepMin: Math.round(deepMs / 60000),
    remMin: Math.round(remMs / 60000),
    lightMin: Math.round(lightMs / 60000),
  });

  if (netSleepMs === 0) return { durationHours: 0, quality: 0 };

  // Quality from stage breakdown if available
  const stageTotal = deepMs + remMs + lightMs;
  const quality = stageTotal > 0
    ? Math.min(100, Math.round(((deepMs / stageTotal) + (remMs / stageTotal) * 2.5) * 100))
    : Math.min(100, Math.round((netSleepMs / (8 * 3600000)) * 50));

  return {
    durationHours: netSleepMs / (1000 * 60 * 60),
    quality,
  };
}

export function convertHRVtoScale(hrvMs: number): number {
  if (hrvMs < 1) return 0;
  const clamped = Math.max(5, Math.min(200, hrvMs));
  // ln(RMSSD) normalizado: ln(5)≈1.61 → 0, ln(200)≈5.30 → 100
  const lnVal = Math.log(clamped);
  const lnMin = Math.log(5);
  const lnMax = Math.log(200);
  return Math.round(((lnVal - lnMin) / (lnMax - lnMin)) * 100);
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

/**
 * Derive pseudo-RMSSD HRV from consecutive HR samples.
 * Used as fallback when the wearable doesn't write HRV to Health Connect.
 * Converts BPM to RR intervals and computes successive differences.
 * Requires >= 10 samples with avg spacing <= 5 min.
 */
function derivePseudoHRV(hrSamples: { value: number; startDate?: string }[]): number | undefined {
  const valid = hrSamples.filter(s => !isNaN(s.value) && s.value > 30 && s.value < 220);
  if (valid.length < 10) return undefined;

  // Check temporal spacing — if samples are > 5 min apart on average, resolution is too low
  if (valid[0]?.startDate && valid[valid.length - 1]?.startDate) {
    const firstTs = new Date(valid[0].startDate).getTime();
    const lastTs = new Date(valid[valid.length - 1].startDate).getTime();
    const spanMs = Math.abs(lastTs - firstTs);
    if (spanMs > 0) {
      const avgSpacingMin = (spanMs / (valid.length - 1)) / 60000;
      if (avgSpacingMin > 5) {
        console.warn('[healthkit] derivePseudoHRV: samples too sparse (avg spacing', avgSpacingMin.toFixed(1), 'min), skipping');
        return undefined;
      }
    }
  }

  // Convert BPM to RR intervals (ms), compute successive differences
  const rrIntervals = valid.map(s => 60000 / s.value);
  let sumSqDiff = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSqDiff += diff * diff;
  }
  const rmssd = Math.sqrt(sumSqDiff / (rrIntervals.length - 1));
  return rmssd > 0 ? Math.round(rmssd * 10) / 10 : undefined;
}

/**
 * Compute stress level using z-score on ln(RMSSD) with contextual modifiers.
 * Follows spec Part 4: z-score clamped to [-3,+3], mapped linearly.
 * Uses population baseline fallback (ln(40), std 0.4) when personal baseline unavailable.
 * Returns 50 (neutral) when HRV is unavailable.
 */
function computeStressLevel(
  avgHrv: number | undefined,
  baseline: BaselineMetrics,
  avgRhr: number | undefined,
  sleepDurationHours: number,
  avgRR: number | undefined
): number {
  // Rule 7: no HRV data → neutral score (50), don't alarm or reassure
  if (avgHrv == null) return 50;

  // 1. ln(RMSSD) of current value
  const lnHrv = Math.log(Math.max(5, Math.min(250, avgHrv)));

  // 2. Use individual baseline in ln domain, or population fallback
  const bl = baseline.hrvLn ?? { mean: Math.log(40), std: 0.4 };

  // 3. z-score of ln(RMSSD)
  const z = bl.std > 0.01 ? (lnHrv - bl.mean) / bl.std : 0;

  // 4. Base score: z-score clamped to [-3,+3], mapped linearly (spec Part 4.2)
  //    z = -3 → stress 100, z = 0 → stress 50, z = +3 → stress 0
  const clamped = Math.max(-3, Math.min(3, z));
  let stress = Math.round(((-clamped + 3) / 6) * 100);

  // 5. Contextual modifiers (spec Part 4.2)
  // Resting HR: delta > 3bpm above baseline → modifier, max +15
  if (avgRhr && baseline.rhr && baseline.rhr.std > 0.01) {
    const delta = avgRhr - baseline.rhr.mean;
    if (delta > 3) {
      stress += Math.round(Math.min((delta - 3) * 2, 15));
    }
  }
  // Sleep duration: deficit > 0.5h vs baseline → modifier, max +10
  if (sleepDurationHours > 0 && baseline.sleepDuration) {
    const deficit = baseline.sleepDuration.mean - sleepDurationHours;
    if (deficit > 0.5) {
      stress += Math.round(Math.min(deficit * 4, 10));
    }
  }
  // Respiratory rate: elevation above normal range → modifier, max +8
  // Spec: delta > baseline SD. Without dedicated respRate baseline,
  // use population mean 15rpm + 1 SD (3rpm) = 18rpm as threshold.
  if (avgRR && avgRR > 18) {
    const delta = avgRR - 18;
    stress += Math.round(Math.min(delta * 1.5, 8));
  }

  return Math.max(0, Math.min(100, stress));
}

/**
 * Downsample HR samples to max 1 per minute.
 * Groups by minute-floor of startDate, keeps the first sample in each bucket.
 */
function downsampleToOnePerMinute(samples: { value: number; startDate: string; [key: string]: unknown }[]): typeof samples {
  const buckets = new Map<number, typeof samples[0]>();
  for (const s of samples) {
    const ts = new Date(s.startDate).getTime();
    const minuteKey = Math.floor(ts / 60000);
    if (!buckets.has(minuteKey)) {
      buckets.set(minuteKey, s);
    }
  }
  return Array.from(buckets.values());
}

/**
 * Build rows for biomarker_samples table from raw provider data.
 * Each row represents one individual reading with its original timestamp.
 */
function buildSampleRows(
  userId: string,
  sourceProvider: string,
  hrSamples: { value: number; startDate: string; source?: string }[],
  rhrSamples: { value: number; startDate: string; source?: string }[],
  hrvSamples: { value: number; startDate: string; source?: string }[],
  spo2Samples: { value: number; startDate: string; source?: string }[],
  rrSamples: { value: number; startDate: string; source?: string }[],
  stepsSamples: { value: number; startDate: string; endDate: string; source?: string }[],
  sleepSamples: SleepSample[],
): Array<{
  user_id: string;
  type: string;
  ts: string;
  end_ts: string | null;
  value: number | null;
  payload_json: Record<string, unknown> | null;
  source: string;
}> {
  const rows: ReturnType<typeof buildSampleRows> = [];
  const src = (s: { source?: string }) => s.source || sourceProvider;

  // HR — downsampled to 1/min
  for (const s of downsampleToOnePerMinute(hrSamples)) {
    rows.push({ user_id: userId, type: 'hr', ts: s.startDate, end_ts: null, value: s.value, payload_json: null, source: src(s) });
  }

  // RHR
  for (const s of rhrSamples) {
    rows.push({ user_id: userId, type: 'rhr', ts: s.startDate, end_ts: null, value: s.value, payload_json: null, source: src(s) });
  }

  // HRV
  for (const s of hrvSamples) {
    rows.push({ user_id: userId, type: 'hrv', ts: s.startDate, end_ts: null, value: s.value, payload_json: null, source: src(s) });
  }

  // SpO2
  for (const s of spo2Samples) {
    rows.push({ user_id: userId, type: 'spo2', ts: s.startDate, end_ts: null, value: s.value, payload_json: null, source: src(s) });
  }

  // Respiratory Rate
  for (const s of rrSamples) {
    rows.push({ user_id: userId, type: 'rr', ts: s.startDate, end_ts: null, value: s.value, payload_json: null, source: src(s) });
  }

  // Steps (have start + end)
  for (const s of stepsSamples) {
    rows.push({ user_id: userId, type: 'steps', ts: s.startDate, end_ts: s.endDate, value: s.value, payload_json: null, source: src(s) });
  }

  // Sleep (each stage with metadata)
  for (const s of sleepSamples) {
    rows.push({
      user_id: userId,
      type: 'sleep',
      ts: s.startDate,
      end_ts: s.endDate,
      value: null,
      payload_json: s.sleepState ? { sleepState: s.sleepState } : null,
      source: (s as any).source || sourceProvider,
    });
  }

  return rows;
}

let observerListenerBound = false;

export async function enableHealthKitBackgroundSync(): Promise<void> {
  const platform = getPlatform();
  if (platform === 'ios') {
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
  // Android: background sync is managed by useHealthSync hook
  // (app state listeners + periodic interval)
  console.info('[healthkit] background sync enabled for platform:', platform);
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

  // Silently check permissions before reading — never show a dialog during sync
  const provider = await getProvider();
  const permissionsOk = await provider.checkPermissions();
  console.info('[healthkit] permissions check before sync (silent):', permissionsOk);

  if (!permissionsOk) {
    console.warn('[healthkit] sync aborted: permissions not granted (user must reconnect via Integrations)');
    return false;
  }

  const userId = await requireValidUserId();

  // Use local date for the day key
  const today = getLocalToday();
  const now = new Date();
  // Two windows: today-only for steps/HR/vitals, overnight for sleep/HRV
  const localMidnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const localMidnightYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const todayStart = localMidnightToday.toISOString();
  const overnightStart = localMidnightYesterday.toISOString();
  const endDate = now.toISOString();

  const [sleepSamples, stepsSamples, hrSamples, rhrSamples, hrvSamples, spo2Samples, rrSamples] = await Promise.all([
    // Sleep + HRV: from yesterday midnight (captures overnight sleep)
    provider.readSleep(overnightStart, endDate).catch(() => [] as SleepSample[]),
    // Steps: today only (avoid double-counting yesterday's steps)
    provider.readSteps(todayStart, endDate).catch(() => []),
    // HR: from yesterday midnight (needed for derivePseudoHRV fallback + overnight data)
    provider.readHeartRate(overnightStart, endDate).catch(() => []),
    provider.readRestingHeartRate(overnightStart, endDate).catch(() => []),
    // HRV: from yesterday midnight (captures overnight readings)
    provider.readHRV(overnightStart, endDate).catch(() => []),
    provider.readSpO2(todayStart, endDate).catch(() => []),
    provider.readRespiratoryRate(todayStart, endDate).catch(() => []),
  ]);

  console.info('[healthkit] sync windows:', { todayStart, overnightStart, endDate, today });

  // If ALL reads returned empty, permissions likely failed — don't overwrite existing data
  const totalSamples = sleepSamples.length + stepsSamples.length + hrSamples.length +
    rhrSamples.length + hrvSamples.length + spo2Samples.length + rrSamples.length;
  if (totalSamples === 0) {
    console.warn('[healthkit] sync aborted: no data from any source (permissions may be missing)');
    return false;
  }

  // Log all data sources found (no filtering — Health Connect already provides
  // validated data, and Samsung Watch data comes through Samsung Health packages
  // which were incorrectly being filtered out as "device" sources)
  const allSamples = [...sleepSamples, ...stepsSamples, ...hrSamples, ...rhrSamples, ...hrvSamples, ...spo2Samples, ...rrSamples] as Array<{ source?: string }>;
  const sources = [...new Set(allSamples.map(s => s.source).filter(Boolean))];
  console.info('[healthkit] data sources found:', sources);

  // ── Persist raw biomarker samples (never overwritten, deduped by constraint) ──
  const sourceProvider = provider.getSourceProvider();
  const rawRows = buildSampleRows(
    userId, sourceProvider,
    hrSamples as any[], rhrSamples, hrvSamples, spo2Samples, rrSamples,
    stepsSamples as any[], sleepSamples,
  );
  if (rawRows.length > 0) {
    try {
      const { error: rawErr } = await supabase
        .from('biomarker_samples')
        .insert(rawRows as any)
        .select('id');  // minimal return
      if (rawErr) {
        // 23505 = unique_violation (duplicates), expected and safe to ignore
        if ((rawErr as any).code !== '23505') {
          console.warn('[healthkit] biomarker_samples insert error:', rawErr.message);
        }
      }
      console.info('[healthkit] raw samples persisted:', rawRows.length, 'rows (deduped silently)');
    } catch (e) {
      console.warn('[healthkit] biomarker_samples insert failed:', e);
    }
  }

  // Use all samples from Health Connect — no source filtering
  const fSleep = sleepSamples;
  const fSteps = stepsSamples;
  const fHr = hrSamples;
  const fRhr = rhrSamples;
  const fHrv = hrvSamples;
  const fSpo2 = spo2Samples;
  const fRr = rrSamples;

  console.info('[healthkit] sync samples count', {
    sleep: fSleep.length, steps: fSteps.length,
    hr: fHr.length, rhr: fRhr.length, hrv: fHrv.length,
    spo2: fSpo2.length, rr: fRr.length,
    platform: getPlatform(), sources,
  });

  const { durationHours, quality: sleepQuality } = calculateSleepQuality(fSleep);

  // Deduplicate steps: multiple sources may count the same steps.
  // Group by source, sum each source's records, then take the MAX source total.
  // This matches how Health Connect's UI deduplicates.
  const stepsBySource = new Map<string, number>();
  for (const s of fSteps) {
    const src = (s as any).source || 'unknown';
    stepsBySource.set(src, (stepsBySource.get(src) || 0) + s.value);
  }
  const totalSteps = stepsBySource.size > 0
    ? Math.max(...stepsBySource.values())
    : 0;
  console.info('[healthkit] steps by source:', Object.fromEntries(stepsBySource), '→ deduped:', totalSteps);

  // Average for biometric values (filter NaN only, allow zeros for steps)
  const bioAvg = (samples: { value: number }[], minVal = 0) => {
    const vals = samples.map(s => s.value).filter(v => !isNaN(v) && v >= minVal);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  };

  // Use dedicated metrics if available, otherwise derive from general HR samples
  const avgHr = bioAvg(fHr, 30);   // HR must be >= 30 bpm
  const avgRhr = bioAvg(fRhr, 30) ?? deriveRHR(fHr);
  // HRV: use real HC data if available, otherwise derive from HR samples
  const hrvFiltered = fHrv.filter(s => s.value >= 5 && s.value <= 250);
  const realHrv = hrvFiltered.length > 0
    ? hrvFiltered.map(s => s.value).reduce((a, b) => a + b, 0) / hrvFiltered.length
    : undefined;
  const avgHrv = realHrv ?? derivePseudoHRV(fHr);
  console.info('[healthkit] HRV source:', realHrv != null ? 'Health Connect' : (avgHrv != null ? 'derived from HR' : 'unavailable'), '| value:', avgHrv);
  const avgSpo2 = bioAvg(fSpo2, 50); // SpO2 must be >= 50%
  const avgRR = bioAvg(fRr, 5);      // RR must be >= 5 breaths/min

  // Calculate baseline BEFORE stress — needed for z-score computation
  const baseline = await calculateBaseline();
  const calibrating = baseline.daysOfData < 7;

  // Stress level: z-score on ln(RMSSD) with contextual modifiers
  // Always calculate — uses population baseline fallback when personal baseline unavailable
  const stressLevel = computeStressLevel(avgHrv, baseline, avgRhr, durationHours, avgRR);

  console.info('[healthkit] derived metrics:', { avgHr, avgRhr, avgHrv, stressLevel, avgSpo2, avgRR, durationHours, sleepQuality, calibrating, daysOfData: baseline.daysOfData });

  const metrics = {
    hr_avg: avgHr ? Math.round(avgHr) : null,
    rhr: avgRhr ? Math.round(avgRhr) : null,
    hrv_sdnn: avgHrv ? Math.round(avgHrv * 10) / 10 : null,
    hrv_rmssd: getPlatform() === 'android' && avgHrv ? Math.round(avgHrv * 10) / 10 : null,
    hrv_type: getPlatform() === 'android' ? 'rmssd' as const : 'sdnn' as const,
    hrv_index: avgHrv ? convertHRVtoScale(avgHrv) : null,
    stress_level: stressLevel,
    sleep_duration_hours: Math.round(durationHours * 10) / 10,
    sleep_quality: sleepQuality,
    steps: totalSteps,
    spo2: avgSpo2 ? Math.round(avgSpo2 * 10) / 10 : null,
    respiratory_rate: avgRR ? Math.round(avgRR * 10) / 10 : null,
    calibrating,
  };

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
    checkPermissions: async () => false,
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
