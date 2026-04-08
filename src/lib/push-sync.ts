/**
 * Push Notification Sync Module
 *
 * Registers FCM push token and handles silent push notifications
 * to trigger health data sync when the app is in background.
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { syncHealthKitData } from '@/lib/healthkit';

let pushListenersBound = false;

/**
 * Register push notifications and save token to Supabase.
 * Call after user login.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[push-sync] Push permission not granted');
      return;
    }

    // Listen for token BEFORE calling register() to avoid race condition
    await PushNotifications.addListener('registration', async (token) => {
      console.info('[push-sync] Push token received:', token.value.substring(0, 20) + '...');

      try {
        const { error } = await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            platform: 'android',
            token: token.value,
            is_active: true,
            app_version: '__APP_VERSION__',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' }
        );
        if (error) {
          console.error('[push-sync] Failed to save push token:', error.message, error.code);
        } else {
          console.info('[push-sync] Push token saved to Supabase');
        }
      } catch (e) {
        console.error('[push-sync] Failed to save push token:', e);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[push-sync] Push registration error:', JSON.stringify(error));
    });

    // Register with FCM AFTER listeners are bound
    await PushNotifications.register();
    console.info('[push-sync] PushNotifications.register() called');
  } catch (e) {
    console.error('[push-sync] registerPushToken error:', e);
  }
}

/**
 * Listen for incoming push notifications that trigger sync.
 * Handles both foreground and background data messages.
 * Call once after login.
 */
export function setupPushSyncHandler(): void {
  if (!Capacitor.isNativePlatform() || pushListenersBound) return;
  pushListenersBound = true;

  // Data-only messages (silent push) — received in foreground and background
  PushNotifications.addListener('pushNotificationReceived', async (notification) => {
    console.info('[push-sync] Push received:', notification.data);

    if (notification.data?.type === 'sync_command') {
      const commandId = notification.data.command_id;
      const command = notification.data.command || 'sync_health_data';

      console.info('[push-sync] Executing sync command:', commandId);

      // Update status to received
      await supabase
        .from('sync_commands')
        .update({ status: 'received', updated_at: new Date().toISOString() })
        .eq('id', commandId);

      try {
        const ok = await syncHealthKitData();

        await supabase
          .from('sync_commands')
          .update({
            status: ok ? 'completed' : 'failed',
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            result: ok
              ? { synced_at: new Date().toISOString(), source: 'health_connect', trigger: 'push' }
              : { error: 'syncHealthKitData returned false', trigger: 'push' },
          })
          .eq('id', commandId);

        console.info('[push-sync] Sync via push', ok ? 'completed' : 'failed');
      } catch (e: any) {
        console.error('[push-sync] Sync via push error:', e);
        await supabase
          .from('sync_commands')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            result: { error: e?.message || 'Unknown error', trigger: 'push' },
          })
          .eq('id', commandId);
      }
    }
  });

  // Notification tapped (user interaction)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.info('[push-sync] Push action performed:', action.notification.data);
    // If user taps a sync notification, trigger sync
    if (action.notification.data?.type === 'sync_command') {
      void syncHealthKitData();
    }
  });

  console.info('[push-sync] Push sync handler registered');
}

/**
 * Unregister push token on logout.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('platform', 'android');

    console.info('[push-sync] Push token deactivated');
  } catch (e) {
    console.error('[push-sync] Failed to deactivate push token:', e);
  }
}
