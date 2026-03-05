import { supabase } from '@/integrations/supabase/client';
import { requireValidUserId } from './auth-session';
import type { Json } from '@/integrations/supabase/types';

export interface BaselineMetrics {
  rhr: { mean: number; std: number } | null;
  hrv: { mean: number; std: number } | null;
  /** HRV baseline in ln(RMSSD) domain for stress z-score computation */
  hrvLn: { mean: number; std: number } | null;
  sleepDuration: { mean: number; std: number } | null;
  sleepQuality: { mean: number; std: number } | null;
  spo2: { mean: number; std: number } | null;
  /** Number of days of data used to compute baseline */
  daysOfData: number;
}

interface MetricsData {
  rhr?: number | null;
  hrv_sdnn?: number | null;
  hrv_index?: number | null;
  sleep_duration_hours?: number | null;
  sleep_quality?: number | null;
  spo2?: number | null;
}

function computeMeanStd(values: number[]): { mean: number; std: number } | null {
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean: Math.round(mean * 100) / 100, std: Math.round(Math.sqrt(variance) * 100) / 100 };
}

/**
 * Compute z-score for a value given mean and std
 */
export function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Calculate 30-day sliding window baseline from ring_daily_data.
 * Falls back to population references if < 3 days of data.
 * Spec Part 3.2: WINDOW_DAYS = 30, recalculate every 24h.
 */
export async function calculateBaseline(): Promise<BaselineMetrics> {
  const userId = await requireValidUserId();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: rows, error } = await supabase
    .from('ring_daily_data')
    .select('metrics')
    .eq('user_id', userId)
    .gte('day', thirtyDaysAgo.toISOString().split('T')[0])
    .order('day', { ascending: false });

  if (error) {
    console.error('[baseline] Query failed:', error.message);
    return { rhr: null, hrv: null, hrvLn: null, sleepDuration: null, sleepQuality: null, spo2: null, daysOfData: 0 };
  }

  const metrics = (rows || []).map((r) => r.metrics as unknown as MetricsData);

  // If less than 3 days, use population fallback
  if (metrics.length < 3) {
    return await getPopulationBaseline(metrics.length);
  }

  const rhrVals = metrics.map((m) => m.rhr).filter((v): v is number => v != null);
  // Use hrv_index (0-100 scale) for pillar baseline — consistent with computePillars input
  const hrvIndexVals = metrics.map((m) => m.hrv_index).filter((v): v is number => v != null);
  // Use hrv_sdnn in ln domain for stress z-score computation
  const hrvRawVals = metrics.map((m) => m.hrv_sdnn).filter((v): v is number => v != null && v >= 5 && v <= 250);
  const hrvLnVals = hrvRawVals.map(v => Math.log(v));
  const sleepDurVals = metrics.map((m) => m.sleep_duration_hours).filter((v): v is number => v != null);
  const sleepQualVals = metrics.map((m) => m.sleep_quality).filter((v): v is number => v != null);
  const spo2Vals = metrics.map((m) => m.spo2).filter((v): v is number => v != null);

  return {
    rhr: computeMeanStd(rhrVals),
    hrv: computeMeanStd(hrvIndexVals),
    hrvLn: computeMeanStd(hrvLnVals),
    sleepDuration: computeMeanStd(sleepDurVals),
    sleepQuality: computeMeanStd(sleepQualVals),
    spo2: computeMeanStd(spo2Vals),
    daysOfData: metrics.length,
  };
}

/**
 * Population-level baseline fallback from referencias_populacionais
 */
async function getPopulationBaseline(daysOfData = 0): Promise<BaselineMetrics> {
  const { data: refs } = await (supabase
    .from('referencias_populacionais')
    .select('metrica, faixa_min, faixa_max') as any);

  if (!refs || refs.length === 0) {
    // Hardcoded fallback — hrv in 0-100 scale, hrvLn in ln(RMSSD) domain
    return {
      rhr: { mean: 65, std: 10 },
      hrv: { mean: 55, std: 12 },
      hrvLn: { mean: Math.log(40), std: 0.4 },
      sleepDuration: { mean: 7, std: 1 },
      sleepQuality: { mean: 60, std: 15 },
      spo2: { mean: 97, std: 1.5 },
      daysOfData,
    };
  }

  const find = (metrica: string) => {
    const r = refs.find((ref: any) => ref.metrica === metrica);
    if (!r) return null;
    const mean = (r.faixa_min + r.faixa_max) / 2;
    const std = (r.faixa_max - r.faixa_min) / 4; // approximate
    return { mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100 };
  };

  return {
    rhr: find('rhr') || { mean: 65, std: 10 },
    hrv: find('hrv_sdnn') || { mean: 55, std: 12 },
    hrvLn: { mean: Math.log(40), std: 0.4 },
    sleepDuration: find('sleep_duration') || { mean: 7, std: 1 },
    sleepQuality: find('sleep_quality') || { mean: 60, std: 15 },
    spo2: find('spo2') || { mean: 97, std: 1.5 },
    daysOfData,
  };
}
