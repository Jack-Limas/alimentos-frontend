import { ApiError, NETWORK_ERROR_CODE } from './api-error';

/** What Render's proxy answers while a free service boots (or the request times out). */
export const WAKING_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

/**
 * True when the backend is most likely asleep and waking up (Render's free
 * plan): no answer at all (network error or timeout) or a 502/503/504 from
 * its proxy. The UI then says "the server is waking up" instead of a generic
 * error. It changes no retry logic.
 */
export function isWakingError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.code === NETWORK_ERROR_CODE || WAKING_STATUSES.has(error.status);
}

/** The Common.* message for a failed load: "waking up" or the generic one. */
export function loadErrorKey(error: unknown): 'waking' | 'loadError' {
  return isWakingError(error) ? 'waking' : 'loadError';
}
