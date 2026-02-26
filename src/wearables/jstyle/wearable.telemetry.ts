/**
 * wearable.telemetry — Production telemetry with feature flags.
 * Logs are ONLY emitted when WEARABLE_DEBUG=true.
 * NEVER logs tokens or sensitive data.
 */

const WEARABLE_DEBUG = import.meta.env.VITE_WEARABLE_DEBUG === 'true';

let requestCounter = 0;

export function nextRequestId(): string {
  requestCounter += 1;
  return `wr-${Date.now()}-${requestCounter}`;
}

export function wlog(tag: string, ...args: unknown[]): void {
  if (WEARABLE_DEBUG) console.log(`[Wearable][${tag}]`, ...args);
}

export function werror(tag: string, ...args: unknown[]): void {
  // Errors always log regardless of flag
  console.error(`[Wearable][${tag}]`, ...args);
}

export function winfo(tag: string, ...args: unknown[]): void {
  if (WEARABLE_DEBUG) console.info(`[Wearable][${tag}]`, ...args);
}

export function isDebugEnabled(): boolean {
  return WEARABLE_DEBUG;
}
