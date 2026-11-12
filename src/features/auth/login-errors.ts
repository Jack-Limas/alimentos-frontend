import { ApiError, isWakingError } from '@/lib/api';

/** i18n keys of the Login.errors namespace. */
export type LoginErrorKey =
  'invalidCredentials' | 'tooManyAttempts' | 'invalidInput' | 'waking' | 'unexpected';

export interface LoginErrorView {
  key: LoginErrorKey;
  /** Only for tooManyAttempts: seconds until the next attempt is allowed. */
  retryAfterSeconds?: number;
}

/** Used when a 429 arrives without a readable Retry-After header. */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** Maps a login failure to what the form shows. The server message is never displayed. */
export function mapLoginError(error: unknown): LoginErrorView {
  if (!(error instanceof ApiError)) return { key: 'unexpected' };
  // No answer or 502/503/504: on Render's free plan the backend is waking up.
  if (isWakingError(error)) return { key: 'waking' };

  switch (error.status) {
    case 400:
      return { key: 'invalidInput' };
    case 401:
      return { key: 'invalidCredentials' };
    case 429:
      return {
        key: 'tooManyAttempts',
        retryAfterSeconds: Math.max(1, error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS),
      };
    default:
      return { key: 'unexpected' };
  }
}

/** Whole seconds left until `deadline` (ms epoch), never negative. */
export function secondsUntil(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** "m:ss" for the lockout countdown, e.g. 842 → "14:02", 5 → "0:05". */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
