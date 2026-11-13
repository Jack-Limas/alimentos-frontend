import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';

/**
 * What the users screen and the password forms show after a failed request.
 * Each kind is a key of `Users.errors` (es/en); the server message is never shown.
 */
export type UserErrorKind =
  | 'protectedAccount'
  | 'userLimitReached'
  | 'duplicateEmail'
  | 'selfLockout'
  | 'lastAdmin'
  | 'wrongCurrentPassword'
  | 'tooManyAttempts'
  | 'invalid'
  | 'forbidden'
  | 'notFound'
  | 'sessionExpired'
  | 'network'
  | 'unexpected';

export interface UserErrorView {
  kind: UserErrorKind;
  /** USER_LIMIT_REACHED: the limit the server applies. */
  limit?: number;
  /** TOO_MANY_REQUESTS: seconds until the next attempt. */
  retryAfterSeconds?: number;
}

const BY_CODE: Readonly<Record<string, UserErrorKind>> = {
  PROTECTED_ACCOUNT: 'protectedAccount',
  USER_LIMIT_REACHED: 'userLimitReached',
  DUPLICATE: 'duplicateEmail',
  SELF_LOCKOUT: 'selfLockout',
  LAST_ADMIN: 'lastAdmin',
  // Only the change-password form gets it: the current password is wrong.
  INVALID_CREDENTIALS: 'wrongCurrentPassword',
  TOO_MANY_REQUESTS: 'tooManyAttempts',
  VALIDATION_ERROR: 'invalid',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'notFound',
  UNAUTHENTICATED: 'sessionExpired',
  TOKEN_EXPIRED: 'sessionExpired',
};

/** Every kind, for the es/en parity test. */
export const USER_ERROR_KINDS: readonly UserErrorKind[] = [
  ...new Set([...Object.values(BY_CODE), 'network', 'unexpected'] as UserErrorKind[]),
];

export function mapUserError(error: unknown): UserErrorView {
  if (!(error instanceof ApiError)) return { kind: 'unexpected' };
  if (error.code === NETWORK_ERROR_CODE) return { kind: 'network' };
  const kind = BY_CODE[error.code] ?? 'unexpected';
  if (kind === 'userLimitReached' && typeof error.details.limit === 'number') {
    return { kind, limit: error.details.limit };
  }
  if (kind === 'tooManyAttempts') {
    const seconds =
      error.retryAfterSeconds ??
      (typeof error.details.retryAfterSeconds === 'number'
        ? error.details.retryAfterSeconds
        : null);
    return seconds === null ? { kind } : { kind, retryAfterSeconds: seconds };
  }
  return { kind };
}
