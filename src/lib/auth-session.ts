import { supabase } from '@/integrations/supabase/client';

/**
 * Safely preview a token for logging (first 8 chars + length).
 * NEVER logs the full token.
 */
function tokenPreview(token: string | undefined | null): string {
  if (!token) return 'NONE';
  return `${token.slice(0, 8)}…(${token.length})`;
}

/**
 * Force refresh the Supabase session unconditionally.
 * MUST be called after any native dialog (HealthKit, permissions, etc.)
 */
export async function forceRefreshSession(): Promise<void> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('[DB][AUTH] refresh failed, signing out:', error.message);
    await supabase.auth.signOut();
    throw new Error('Session expired. Please log in again.');
  }
  console.info('[DB][AUTH] session refreshed', {
    userId: data.session?.user?.id ?? 'NONE',
    hasToken: !!data.session?.access_token,
    expiresAt: data.session?.expires_at
      ? new Date(data.session.expires_at * 1000).toISOString()
      : 'NONE',
  });
}

/**
 * Require a valid user ID AND access_token from the current session.
 * If session is stale, attempts one refresh before aborting.
 * userId comes EXCLUSIVELY from session.user.id — never external.
 */
export async function requireValidUserId(): Promise<string> {
  let { data: { session } } = await supabase.auth.getSession();

  // If no token, attempt one refresh
  if (!session?.access_token) {
    console.warn('[DB][AUTH] no token on first attempt, refreshing…');
    try {
      await forceRefreshSession();
      const refreshed = await supabase.auth.getSession();
      session = refreshed.data.session;
    } catch {
      // forceRefreshSession already signs out
    }
  }

  if (!session?.user?.id || !session?.access_token) {
    console.warn('[DB][AUTH] ABORT — no valid session', {
      userId: session?.user?.id ?? 'NONE',
      hasToken: !!session?.access_token,
    });
    throw new Error('No valid session. Please log in again.');
  }

  console.info('[DB][AUTH] validated', {
    userId: session.user.id,
    hasToken: true,
    tokenPreview: tokenPreview(session.access_token),
    expiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : 'NONE',
  });

  return session.user.id;
}

/**
 * Retry wrapper for ALL write operations (insert/update/upsert/delete).
 * On 42501 (RLS violation), refreshes session and retries once.
 * Emits structured diagnostic logs for every outcome.
 */
export async function retryOnAuthErrorLabeled<T>(
  fn: () => Promise<{ data: T; error: { code?: string; message: string; details?: string; hint?: string } | null }>,
  meta?: { table?: string; operation?: string }
): Promise<{ data: T; error: { code?: string; message: string } | null }> {
  const tag = meta?.table ? `[DB][WRITE:${meta.table}]` : '[DB][WRITE]';

  const result = await fn();

  if (result.error) {
    const is42501 = result.error.code === '42501' || result.error.message?.includes('42501');

    console.error(`${tag} error`, {
      table: meta?.table ?? 'unknown',
      operation: meta?.operation ?? 'unknown',
      code: result.error.code,
      message: result.error.message,
      details: (result.error as any).details,
      hint: (result.error as any).hint,
    });

    if (is42501) {
      console.warn(`${tag} 42501 detected — refreshing session and retrying…`);
      try {
        await forceRefreshSession();
      } catch {
        return result;
      }
      const retry = await fn();
      if (retry.error) {
        console.error(`${tag} retry FAILED`, {
          code: retry.error.code,
          message: retry.error.message,
        });
      } else {
        console.info(`${tag} retry SUCCESS`);
      }
      return retry;
    }
  } else {
    const rows = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0;
    console.info(`${tag} OK`, {
      table: meta?.table,
      operation: meta?.operation,
      rowsCount: rows,
    });
  }

  return result;
}
