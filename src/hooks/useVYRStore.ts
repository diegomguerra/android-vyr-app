import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { requireValidUserId, retryOnAuthErrorLabeled } from '@/lib/auth-session';
import { getCurrentPhase, computeScore, getLevel, getLimitingFactor } from '@/lib/vyr-engine';
import type { VYRState, PillarScore } from '@/lib/vyr-engine';
import { enableHealthKitBackgroundSync, isHealthKitAvailable, requestHealthKitPermissions, runIncrementalHealthSync } from '@/lib/healthkit';

export interface DayEntry {
  day: string;
  score: number;
  level: string;
  pillars: PillarScore;
  phase: string;
}

export interface WearableConnection {
  provider: string;
  status: string;
  lastSyncAt: string | null;
  scopes: string[];
}

export interface ActionLog {
  id: string;
  action_type: string;
  payload: any;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  checkpoint_type: string;
  data: any;
  created_at: string;
}

export interface DailyReview {
  id: string;
  day: string;
  focus_score: number | null;
  clarity_score: number | null;
  energy_score: number | null;
  mood_score: number | null;
  notes: string | null;
}

const emptyState: VYRState = {
  score: 0,
  level: 'Crítico',
  pillars: { energia: 0, clareza: 0, estabilidade: 0 },
  limitingFactor: 'energia',
  phase: getCurrentPhase(),
};

export function useVYRStore() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [state, setState] = useState<VYRState>(emptyState);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyByDay, setHistoryByDay] = useState<DayEntry[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
  const [wearableConnection, setWearableConnection] = useState<WearableConnection | null>(null);
  const [sachetConfirmation, setSachetConfirmation] = useState<{ show: boolean; phase: string }>({ show: false, phase: 'BOOT' });
  const [userName, setUserName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [statesRes, actionsRes, checkpointsRes, reviewsRes, integrationRes, nameRes] = await Promise.all([
      supabase.from('computed_states').select('day, score, level, pillars, phase')
        .eq('user_id', userId).order('day', { ascending: false }).limit(30),
      supabase.from('action_logs').select('id, action_type, payload, created_at')
        .eq('user_id', userId).eq('day', today),
      supabase.from('checkpoints').select('id, checkpoint_type, data, created_at')
        .eq('user_id', userId).eq('day', today),
      supabase.from('daily_reviews').select('id, day, focus_score, clarity_score, energy_score, mood_score, notes')
        .eq('user_id', userId).order('day', { ascending: false }).limit(7),
      supabase.from('user_integrations').select('provider, status, last_sync_at, scopes')
        .eq('user_id', userId).eq('provider', 'apple_health').maybeSingle(),
      supabase.from('participantes').select('nome_publico')
        .eq('user_id', userId).maybeSingle(),
    ]);

    // History
    if (statesRes.data && statesRes.data.length > 0) {
      const history: DayEntry[] = statesRes.data.map((d) => {
        const p = d.pillars as any;
        return {
          day: d.day,
          score: d.score ?? 0,
          level: d.level ?? 'Crítico',
          pillars: { energia: p?.energia ?? 0, clareza: p?.clareza ?? 0, estabilidade: p?.estabilidade ?? 0 },
          phase: d.phase ?? 'BOOT',
        };
      });
      setHistoryByDay(history);

      // Today's state
      const todayEntry = history.find((h) => h.day === today);
      if (todayEntry) {
        setState({
          score: todayEntry.score,
          level: todayEntry.level,
          pillars: todayEntry.pillars,
          limitingFactor: getLimitingFactor(todayEntry.pillars),
          phase: (todayEntry.phase as VYRState['phase']) || getCurrentPhase(),
        });
        setHasData(true);
      }
    }

    // Actions
    if (actionsRes.data) setActionLogs(actionsRes.data);

    // Checkpoints
    if (checkpointsRes.data) setCheckpoints(checkpointsRes.data);

    // Reviews
    if (reviewsRes.data) setDailyReviews(reviewsRes.data);

    // Wearable
    if (integrationRes.data) {
      setWearableConnection({
        provider: integrationRes.data.provider,
        status: integrationRes.data.status,
        lastSyncAt: integrationRes.data.last_sync_at,
        scopes: integrationRes.data.scopes || [],
      });
    }

    // Name
    if (nameRes.data?.nome_publico) {
      setUserName(nameRes.data.nome_publico.split(' ')[0]);
    }

    setLoading(false);
  }, [userId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Actions
  const logAction = useCallback(async (phase: string, payload?: object) => {
    const uid = await requireValidUserId();
    await retryOnAuthErrorLabeled(async () => {
      const result = await supabase.from('action_logs').insert({
        user_id: uid,
        day: today,
        action_type: phase,
        payload: { confirmed_at: new Date().toISOString(), ...payload },
      }).select();
      return result;
    }, { table: 'action_logs', operation: 'insert' });
    setActionLogs((prev) => [...prev, {
      id: crypto.randomUUID(),
      action_type: phase,
      payload: payload ?? {},
      created_at: new Date().toISOString(),
    }]);
    setSachetConfirmation({ show: true, phase });
  }, [today]);

  const addCheckpoint = useCallback(async (note: string) => {
    const uid = await requireValidUserId();
    await retryOnAuthErrorLabeled(async () => {
      const result = await supabase.from('checkpoints').insert({
        user_id: uid,
        day: today,
        checkpoint_type: 'observation',
        data: { note, timestamp: new Date().toISOString() },
      }).select();
      return result;
    }, { table: 'checkpoints', operation: 'insert' });
    setCheckpoints((prev) => [...prev, {
      id: crypto.randomUUID(),
      checkpoint_type: 'observation',
      data: { note },
      created_at: new Date().toISOString(),
    }]);
  }, [today]);

  const dismissConfirmation = useCallback(() => {
    setSachetConfirmation({ show: false, phase: '' });
  }, []);

  const activateTransition = useCallback(async (targetPhase: string) => {
    await logAction(targetPhase, { transition: true });
  }, [logAction]);

  const connectWearable = useCallback(async () => {
    const available = await isHealthKitAvailable();
    if (!available) return false;
    const ok = await requestHealthKitPermissions();
    if (ok) {
      const uid = await requireValidUserId();
      await retryOnAuthErrorLabeled(async () => {
        const result = await supabase.from('user_integrations').upsert({
          user_id: uid,
          provider: 'apple_health',
          status: 'active',
          scopes: ['heartRate', 'restingHeartRate', 'heartRateVariability', 'sleep', 'steps', 'oxygenSaturation', 'bodyTemperature', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'vo2Max', 'activeEnergyBurned'],
        }, { onConflict: 'user_id,provider' } as any).select();
        return result;
      }, { table: 'user_integrations', operation: 'upsert' });
      await enableHealthKitBackgroundSync();
      // Trigger first sync immediately after connecting
      const syncOk = await runIncrementalHealthSync('manual');
      setWearableConnection({
        provider: 'apple_health',
        status: 'active',
        lastSyncAt: syncOk ? new Date().toISOString() : null,
        scopes: ['heartRate', 'restingHeartRate', 'heartRateVariability', 'sleep', 'steps', 'oxygenSaturation', 'bodyTemperature', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'vo2Max', 'activeEnergyBurned'],
      });
    }
    return ok;
  }, []);

  const disconnectWearable = useCallback(async () => {
    const uid = await requireValidUserId();
    await retryOnAuthErrorLabeled(async () => {
      const result = await supabase.from('user_integrations')
        .update({ status: 'disconnected' })
        .eq('user_id', uid)
        .eq('provider', 'apple_health')
        .select();
      return result;
    }, { table: 'user_integrations', operation: 'update' });
    setWearableConnection(null);
  }, []);

  const syncWearable = useCallback(async () => {
    const ok = await runIncrementalHealthSync('manual');
    if (ok) {
      setWearableConnection((prev) => prev ? { ...prev, lastSyncAt: new Date().toISOString() } : prev);
      await loadData();
    }
    return ok;
  }, [loadData]);

  const actionsTaken = actionLogs.map((a) => a.action_type);

  return {
    state,
    hasData,
    loading,
    historyByDay,
    actionLogs,
    actionsTaken,
    checkpoints,
    dailyReviews,
    wearableConnection,
    sachetConfirmation,
    userName,
    logAction,
    addCheckpoint,
    dismissConfirmation,
    activateTransition,
    connectWearable,
    disconnectWearable,
    syncWearable,
    refresh: loadData,
  };
}
