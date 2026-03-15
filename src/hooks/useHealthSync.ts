import { useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { useAuth } from '@/contexts/AuthContext';
import {
  isHealthKitAvailable,
  requestHealthKitPermissions,
  enableHealthKitBackgroundSync,
  runIncrementalHealthSync,
} from '@/lib/healthkit';
import { getPlatform } from '@/lib/health-provider';
import { supabase } from '@/integrations/supabase/client';

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

      // Verify Health Connect is still available and permissions are granted
      const available = await isHealthKitAvailable();
      if (!available) {
        console.warn('[health-sync] Health Connect not available');
        return;
      }

      const granted = await requestHealthKitPermissions();
      if (!granted) {
        console.warn('[health-sync] permissions not granted, marking disconnected');
        await supabase
          .from('user_integrations')
          .update({ status: 'disconnected' })
          .eq('user_id', userId)
          .eq('provider', 'health_connect');
        return;
      }

      // Re-enable background sync (iOS observers, etc.)
      await enableHealthKitBackgroundSync();

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

    return () => {
      mountedRef.current = false;
      stopPeriodicSync();
      appStateListener?.remove().catch(() => {});
      resumeListener?.remove().catch(() => {});
    };
  }, [userId, autoReconnect, throttledSync, startPeriodicSync, stopPeriodicSync]);

  // ── Reset on logout ──
  useEffect(() => {
    if (!userId) {
      initDoneRef.current = false;
      lastSyncRef.current = 0;
      stopPeriodicSync();
    }
  }, [userId, stopPeriodicSync]);
}
