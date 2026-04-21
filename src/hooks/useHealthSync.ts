import { useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { useAuth } from '@/contexts/AuthContext';
import {
  isHealthKitAvailable,
  checkHealthKitPermissions,
  enableHealthKitBackgroundSync,
  runIncrementalHealthSync,
  syncHealthKitData,
} from '@/lib/healthkit';
import { getPlatform } from '@/lib/health-provider';
import { supabase } from '@/integrations/supabase/client';
import { registerPushToken, setupPushSyncHandler, unregisterPushToken } from '@/lib/push-sync';
import { runWearableSyncIfPaired } from '@/wearables/jstyle/wearable.sync';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Sync interval while app is in foreground (15 minutes).
 * Keeps biomarker data fresh without excessive battery drain.
 */
const FOREGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Minimum time between syncs to avoid hammering Health Connect (2 minutes).
 */
const MIN_SYNC_GAP_MS = 2 * 60 * 1000;

/**
 * Centralized Health Connect sync lifecycle manager.
 *
 * Handles:
 * - Auto-reconnect on login when integration already exists as active/connected
 * - Sync on app resume (foreground)
 * - Periodic sync every 15 min while in foreground
 * - Cleanup on logout
 *
 * Must be mounted ONCE for authenticated users.
 */
export function useHealthSync() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const initDoneRef = useRef(false);

  /**
   * Run sync only if enough time has passed since last sync.
   * Returns true if sync ran successfully.
   */
  const throttledSync = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastSyncRef.current < MIN_SYNC_GAP_MS) {
      console.info('[health-sync] throttled — last sync was', Math.round((now - lastSyncRef.current) / 1000), 's ago');
      return false;
    }
    lastSyncRef.current = now;
    try {
      const ok = await runIncrementalHealthSync('manual');
      console.info('[health-sync] sync result:', ok);
      return ok;
    } catch (e) {
      console.error('[health-sync] sync failed:', e);
      return false;
    }
  }, []);

  /**
   * Check if user has an existing active integration and auto-reconnect.
   * This runs once on mount (login / app start).
   */
  const autoReconnect = useCallback(async () => {
    if (!userId) return;

    const platform = getPlatform();
    if (platform === 'web') return;

    try {
      // Check DB for existing active integration
      const { data: integration } = await (supabase
        .from('user_integrations')
        .select('status')
        .eq('user_id', userId)
        .eq('provider', 'health_connect')
        .maybeSingle() as any);

      const isActive = integration?.status === 'active' || integration?.status === 'connected';
      if (!isActive) {
        console.info('[health-sync] no active integration found, skipping auto-reconnect');
        return;
      }

      // Verify Health Connect is still available and permissions are granted (silently)
      const available = await isHealthKitAvailable();
      if (!available) {
        console.warn('[health-sync] Health Connect not available');
        return;
      }

      // Silent check — never show permission dialog on auto-reconnect.
      // If permissions were revoked, user must reconnect via Integrations page.
      const granted = await checkHealthKitPermissions();
      if (!granted) {
        console.warn('[health-sync] permissions not granted (silent check), marking disconnected');
        await supabase
          .from('user_integrations')
          .update({ status: 'disconnected' })
          .eq('user_id', userId)
          .eq('provider', 'health_connect');
        return;
      }

      // Re-enable background sync (iOS observers, etc.)
      await enableHealthKitBackgroundSync();

      // Register push token for background sync via admin dashboard
      await registerPushToken(userId);
      setupPushSyncHandler();

      console.info('[health-sync] auto-reconnected, triggering initial sync');
      await throttledSync();
    } catch (e) {
      console.error('[health-sync] auto-reconnect failed:', e);
    }
  }, [userId, throttledSync]);

  /**
   * Start the foreground periodic sync interval.
   */
  const startPeriodicSync = useCallback(() => {
    if (intervalRef.current) return; // already running
    console.info('[health-sync] starting periodic sync (every', FOREGROUND_SYNC_INTERVAL_MS / 60000, 'min)');
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        void throttledSync();
      }
    }, FOREGROUND_SYNC_INTERVAL_MS);
  }, [throttledSync]);

  /**
   * Stop the foreground periodic sync interval.
   */
  const stopPeriodicSync = useCallback(() => {
    if (intervalRef.current) {
      console.info('[health-sync] stopping periodic sync');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Handle a remote sync command from the admin dashboard.
   * Triggers a full sync and updates the command status in Supabase.
   */
  const handleSyncCommand = useCallback(async (commandId: string, command: string) => {
    console.info('[health-sync] Received remote sync command:', command, '(id:', commandId, ')');

    // Mark as received
    await supabase
      .from('sync_commands')
      .update({ status: 'received', updated_at: new Date().toISOString() })
      .eq('id', commandId);

    try {
      // 1. Force a full Health Connect sync (bypass throttle for admin-triggered syncs)
      lastSyncRef.current = 0;
      const healthKitOk = await syncHealthKitData();

      // 2. Wearable sync (JStyle X3/V5 or QRing) — best-effort
      let wearableSummary: Awaited<ReturnType<typeof runWearableSyncIfPaired>> = { ran: false };
      try {
        wearableSummary = await runWearableSyncIfPaired();
        console.info('[health-sync] Wearable sync summary:', wearableSummary);
      } catch (e: any) {
        console.warn('[health-sync] Wearable sync threw (non-fatal):', e);
        wearableSummary = { ran: true, reason: 'exception', inserted: 0, duplicates: 0, errors: 1 };
      }

      // 3. Recompute VYR state from ring_daily_data (includes fresh wearable samples).
      // vyr-compute-state edge function reads the latest ring_daily_data and writes computed_states.
      let vyrRecomputed = false;
      if (wearableSummary.ran && (wearableSummary.inserted ?? 0) > 0) {
        try {
          const { error: computeErr } = await supabase.functions.invoke('vyr-compute-state', { body: {} });
          if (!computeErr) vyrRecomputed = true;
          else console.warn('[health-sync] vyr-compute-state failed:', computeErr.message);
        } catch (e: any) {
          console.warn('[health-sync] vyr-compute-state threw (non-fatal):', e);
        }
      }

      const overallOk = healthKitOk;

      await supabase
        .from('sync_commands')
        .update({
          status: overallOk ? 'completed' : 'failed',
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          result: {
            synced_at: new Date().toISOString(),
            source: 'health_connect',
            healthkit_ok: healthKitOk,
            wearable: wearableSummary,
            vyr_recomputed: vyrRecomputed,
          },
        })
        .eq('id', commandId);

      console.info('[health-sync] Remote sync', overallOk ? 'completed' : 'failed',
        '— wearable ran:', wearableSummary.ran, 'VYR recomputed:', vyrRecomputed);
    } catch (e: any) {
      console.error('[health-sync] Remote sync error:', e);
      await supabase
        .from('sync_commands')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          result: { error: e?.message || 'Unknown error' },
        })
        .eq('id', commandId);
    }
  }, []);

  // ── Main effect: lifecycle management ──
  useEffect(() => {
    if (!userId) return;

    const platform = getPlatform();
    if (platform === 'web') return;

    mountedRef.current = true;

    // 1. Auto-reconnect + initial sync on mount
    if (!initDoneRef.current) {
      initDoneRef.current = true;
      void autoReconnect();
    }

    // 2. Start periodic foreground sync
    startPeriodicSync();

    // 3. Listen for app state changes (foreground/background)
    let appStateListener: { remove: () => Promise<void> } | null = null;

    App.addListener('appStateChange', ({ isActive }) => {
      if (!mountedRef.current) return;
      if (isActive) {
        console.info('[health-sync] app resumed to foreground');
        void throttledSync();
        startPeriodicSync();
      } else {
        console.info('[health-sync] app moved to background');
        stopPeriodicSync();
      }
    }).then((handle) => {
      appStateListener = handle;
    }).catch((e) => {
      // On web/unsupported platforms, this is expected to fail
      console.warn('[health-sync] appStateChange listener not available:', e);
    });

    // 4. Listen for Capacitor resume event (Android-specific, fires on activity resume)
    let resumeListener: { remove: () => Promise<void> } | null = null;

    App.addListener('resume', () => {
      if (!mountedRef.current) return;
      console.info('[health-sync] app resume event');
      void throttledSync();
    }).then((handle) => {
      resumeListener = handle;
    }).catch(() => {
      // Expected on web
    });

    // 5. Listen for remote sync commands via Supabase Realtime
    let syncChannel: RealtimeChannel | null = null;

    syncChannel = supabase
      .channel(`sync-commands-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_commands',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const record = payload.new;
          if (record && (record.status === 'pending' || record.status === 'sent')) {
            void handleSyncCommand(record.id, record.command);
          }
        }
      )
      .subscribe((status: string) => {
        console.info('[health-sync] sync_commands realtime:', status);
      });

    // 6. Check for any pending sync commands on mount (in case inserted while offline)
    void (async () => {
      try {
        const { data: pending } = await supabase
          .from('sync_commands')
          .select('id, command')
          .eq('user_id', userId)
          .in('status', ['pending', 'sent'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (pending && pending.length > 0) {
          console.info('[health-sync] Found pending sync command on mount:', pending[0].id);
          void handleSyncCommand(pending[0].id, pending[0].command);
        }
      } catch (e) {
        console.warn('[health-sync] Failed to check pending sync commands:', e);
      }
    })();

    return () => {
      mountedRef.current = false;
      stopPeriodicSync();
      appStateListener?.remove().catch(() => {});
      resumeListener?.remove().catch(() => {});
      if (syncChannel) {
        supabase.removeChannel(syncChannel);
      }
    };
  }, [userId, autoReconnect, throttledSync, startPeriodicSync, stopPeriodicSync, handleSyncCommand]);

  // ── Reset on logout ──
  useEffect(() => {
    if (!userId) {
      initDoneRef.current = false;
      lastSyncRef.current = 0;
      stopPeriodicSync();
    }
    return () => {
      // Deactivate push token on logout
      if (userId) {
        void unregisterPushToken(userId);
      }
    };
  }, [userId, stopPeriodicSync]);
}
