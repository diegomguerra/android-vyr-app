import { supabase } from '@/integrations/supabase/client';
import { requireValidUserId } from './auth-session';
import type { Json } from '@/integrations/supabase/types';

export interface BaselineMetrics {
  rhr: { mean: number; std: number } | null;
  hrv: { mean: number; std: number } | null;
  sleepDuration: { mean: number; std: number } | null;
  sleepQuality: { mean: number; std: number } | null;
  spo2: { mean: number; std: number } | null;
}

interface MetricsData {
  rhr?: number | null;
  hrv_sdnn?: number | null;
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
 * Calculate 14-day baseline from ring_daily_data.
 * Falls back to population references if < 3 days of data.
 */
export async function calculateBaseline(): Promise<BaselineMetrics> {
  const userId = await requireValidUserId();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: rows, error } = await supabase
    .from('ring_daily_data')
    .select('metrics')
    .eq('user_id', userId)
    .gte('day', fourteenDaysAgo.toISOString().split('T')[0])
    .order('day', { ascending: false });

  if (error) {
    console.error('[baseline] Query failed:', error.message);
    return { rhr: null, hrv: null, sleepDuration: null, sleepQuality: null, spo2: null };
  }

  const metrics = (rows || []).map((r) => r.metrics as unknown as MetricsData);

  // If less than 3 days, use population fallback
  if (metrics.length < 3) {
    return await getPopulationBaseline();
  }

  const rhrVals = metrics.map((m) => m.rhr).filter((v): v is number => v != null);
  const hrvVals = metrics.map((m) => m.hrv_sdnn).filter((v): v is number => v != null);
  const sleepDurVals = metrics.map((m) => m.sleep_duration_hours).filter((v): v is number => v != null);
  const sleepQualVals = metrics.map((m) => m.sleep_quality).filter((v): v is number => v != null);
  const spo2Vals = metrics.map((m) => m.spo2).filter((v): v is number => v != null);

  return {
    rhr: computeMeanStd(rhrVals),
    hrv: computeMeanStd(hrvVals),
    sleepDuration: computeMeanStd(sleepDurVals),
    sleepQuality: computeMeanStd(sleepQualVals),
    spo2: computeMeanStd(spo2Vals),
  };
}

/**
 * Population-level baseline fallback from referencias_populacionais
 */
async function getPopulationBaseline(): Promise<BaselineMetrics> {
  const { data: refs } = await supabase
    .from('referencias_populacionais')
    .select('metrica, faixa_min, faixa_max');

  if (!refs || refs.length === 0) {
    // Hardcoded fallback
    return {
      rhr: { mean: 65, std: 10 },
      hrv: { mean: 40, std: 15 },
      sleepDuration: { mean: 7, std: 1 },
      sleepQuality: { mean: 60, std: 15 },
      spo2: { mean: 97, std: 1.5 },
    };
  }

  const find = (metrica: string) => {
    const r = refs.find((ref) => ref.metrica === metrica);
    if (!r) return null;
    const mean = (r.faixa_min + r.faixa_max) / 2;
    const std = (r.faixa_max - r.faixa_min) / 4; // approximate
    return { mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100 };
  };

  return {
    rhr: find('rhr') || { mean: 65, std: 10 },
    hrv: find('hrv_sdnn') || { mean: 40, std: 15 },
    sleepDuration: find('sleep_duration') || { mean: 7, std: 1 },
    sleepQuality: find('sleep_quality') || { mean: 60, std: 15 },
    spo2: find('spo2') || { mean: 97, std: 1.5 },
  };
}
