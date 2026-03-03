import { supabase } from '@/integrations/supabase/client';
import { requireValidUserId, retryOnAuthErrorLabeled } from './auth-session';
import { computeState } from './vyr-engine';
import type { BiometricData } from './vyr-engine';
import { calculateBaseline } from './vyr-baseline';
import type { Json } from '@/integrations/supabase/types';
import { getLocalToday } from './date-utils';

export interface PhasePerceptionValues {
  foco: number;
  clareza: number;
  energia: number;
  estabilidade: number;
}

interface SubjectiveInput {
  energy: number;    // 0-10
  clarity: number;   // 0-10
  focus: number;     // 0-10
  stability: number; // 0-10
}

/**
 * Recompute VYR state merging existing biometric data with subjective perceptions.
 * Called after user submits perceptions in PerceptionsTab.
 */
export async function recomputeStateWithPerceptions(subjective: SubjectiveInput): Promise<void> {
  try {
    const userId = await requireValidUserId();
    const today = getLocalToday();

    // Get existing computed_state raw_input (biometric data from last sync)
    const { data: existing } = await (supabase
      .from('computed_states')
      .select('raw_input')
      .eq('user_id', userId)
      .eq('day', today)
      .maybeSingle() as any);

    const rawInput = (existing?.raw_input ?? {}) as Record<string, any>;

    // Merge biometric + subjective (handle both camelCase keys from auto-compute and legacy keys)
    const biometricData: BiometricData = {
      rhr: rawInput.rhr,
      sleepDuration: rawInput.sleepDuration ?? rawInput.sleep_duration_hours,
      sleepQuality: rawInput.sleepQuality ?? rawInput.sleep_quality,
      spo2: rawInput.spo2,
      hrvIndex: rawInput.hrvIndex ?? rawInput.hrv_index,
      hrvRawMs: rawInput.hrvRawMs ?? rawInput.hrv_rmssd ?? rawInput.hrv_sdnn,
      stressLevel: rawInput.stressLevel ?? rawInput.stress_level,
    };

    // Attach subjective scores as extra metadata (not part of BiometricData interface)
    const enrichedData = {
      ...biometricData,
      subjectiveEnergy: subjective.energy,
      subjectiveClarity: subjective.clarity,
      subjectiveFocus: subjective.focus,
      subjectiveStability: subjective.stability,
    };

    const baseline = await calculateBaseline();
    const vyrState = computeState(biometricData, baseline);
    console.log('[vyr-recompute] state with perceptions', vyrState);

    await retryOnAuthErrorLabeled(async () => {
      const res = await (supabase.from('computed_states') as any).upsert(
        [{
          user_id: userId,
          day: today,
          score: vyrState.score,
          level: vyrState.level,
          phase: vyrState.phase,
          pillars: vyrState.pillars as unknown as Json,
          raw_input: enrichedData as unknown as Json,
        }],
        { onConflict: 'user_id,day' }
      ).select();
      return { data: res.data, error: res.error ? { code: (res.error as any).code, message: res.error.message } : null };
    }, { table: 'computed_states', operation: 'upsert' });
  } catch (e) {
    console.error('[vyr-recompute] failed:', e);
  }
}

/**
 * After all 3 phases are registered, compute the day mean and upsert daily_reviews.
 */
export async function computeDayMeanFromPhases(phaseValues: PhasePerceptionValues[]): Promise<void> {
  try {
    if (phaseValues.length === 0) return;

    const mean = {
      foco: phaseValues.reduce((s, v) => s + v.foco, 0) / phaseValues.length,
      clareza: phaseValues.reduce((s, v) => s + v.clareza, 0) / phaseValues.length,
      energia: phaseValues.reduce((s, v) => s + v.energia, 0) / phaseValues.length,
      estabilidade: phaseValues.reduce((s, v) => s + v.estabilidade, 0) / phaseValues.length,
    };

    const userId = await requireValidUserId();
    const today = getLocalToday();

    await retryOnAuthErrorLabeled(async () => {
      const result = await supabase.from('daily_reviews').upsert({
        user_id: userId,
        day: today,
        focus_score: Math.round(mean.foco * 10) / 10,
        clarity_score: Math.round(mean.clareza * 10) / 10,
        energy_score: Math.round(mean.energia * 10) / 10,
        mood_score: Math.round(mean.estabilidade * 10) / 10,
      }, { onConflict: 'user_id,day' }).select();
      return result;
    }, { table: 'daily_reviews', operation: 'upsert' });

    // Recompute VYR state with the mean values
    await recomputeStateWithPerceptions({
      energy: mean.energia,
      clarity: mean.clareza,
      focus: mean.foco,
      stability: mean.estabilidade,
    });

    console.log('[vyr-recompute] day mean computed from phases:', mean);
  } catch (e) {
    console.error('[vyr-recompute] computeDayMeanFromPhases failed:', e);
  }
}
