import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RETRY_AFTER_SECONDS,
  formatCountdown,
  mapLoginError,
  secondsUntil,
  type LoginErrorKey,
} from '@/features/auth/login-errors';
import {
  hasFieldErrors,
  validateLoginForm,
  type LoginFieldErrorKey,
} from '@/features/auth/login-validation';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import en from '../messages/en.json';
import es from '../messages/es.json';

function apiError(status: number, code: string, retryAfterSeconds: number | null = null) {
  return new ApiError(status, code, 'server message', {}, retryAfterSeconds);
}

describe('mapLoginError', () => {
  it('maps 401 to invalidCredentials', () => {
    expect(mapLoginError(apiError(401, 'INVALID_CREDENTIALS'))).toEqual({
      key: 'invalidCredentials',
    });
  });

  it('maps 429 to tooManyAttempts with the Retry-After seconds', () => {
    expect(mapLoginError(apiError(429, 'TOO_MANY_REQUESTS', 842))).toEqual({
      key: 'tooManyAttempts',
      retryAfterSeconds: 842,
    });
  });

  it('falls back to a default wait when a 429 has no Retry-After', () => {
    expect(mapLoginError(apiError(429, 'TOO_MANY_REQUESTS'))).toEqual({
      key: 'tooManyAttempts',
      retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS,
    });
  });

  it('never counts down from zero', () => {
    expect(mapLoginError(apiError(429, 'TOO_MANY_REQUESTS', 0)).retryAfterSeconds).toBe(1);
  });

  it('maps 400 to invalidInput', () => {
    expect(mapLoginError(apiError(400, 'VALIDATION_ERROR'))).toEqual({ key: 'invalidInput' });
  });

  it('maps a network failure to network', () => {
    expect(mapLoginError(apiError(0, NETWORK_ERROR_CODE))).toEqual({ key: 'network' });
  });

  it.each([
    ['a 500', apiError(500, 'INTERNAL_ERROR')],
    ['a 503', apiError(503, 'UNKNOWN_ERROR')],
    ['a non-API error', new Error('boom')],
    ['a thrown string', 'boom'],
  ])('maps %s to unexpected', (_label, error) => {
    expect(mapLoginError(error)).toEqual({ key: 'unexpected' });
  });
});

describe('validateLoginForm', () => {
  it('accepts a valid email (trimmed) and any non-empty password', () => {
    expect(validateLoginForm({ email: '  ana@example.org ', password: 'x' })).toEqual({});
  });

  it.each([
    ['', 'emailRequired'],
    ['   ', 'emailRequired'],
    ['ana', 'emailInvalid'],
    ['ana@example', 'emailInvalid'],
    ['ana @example.org', 'emailInvalid'],
    [`${'a'.repeat(250)}@x.org`, 'emailTooLong'],
  ])('flags the email %j as %s', (email, key) => {
    expect(validateLoginForm({ email, password: 'x' }).email).toBe(key);
  });

  it('requires a password and caps its length like the server', () => {
    expect(validateLoginForm({ email: 'a@b.co', password: '' }).password).toBe('passwordRequired');
    expect(validateLoginForm({ email: 'a@b.co', password: 'p'.repeat(201) }).password).toBe(
      'passwordTooLong',
    );
  });

  it('reports whether there is any error', () => {
    expect(hasFieldErrors({})).toBe(false);
    expect(hasFieldErrors({ password: 'passwordRequired' })).toBe(true);
  });
});

describe('countdown helpers', () => {
  it('rounds the seconds left up and never goes negative', () => {
    expect(secondsUntil(10_000, 0)).toBe(10);
    expect(secondsUntil(10_000, 9_001)).toBe(1);
    expect(secondsUntil(10_000, 12_000)).toBe(0);
  });

  it.each([
    [842, '14:02'],
    [900, '15:00'],
    [59, '0:59'],
    [5, '0:05'],
    [0, '0:00'],
    [-3, '0:00'],
  ])('formats %d seconds as %s', (seconds, text) => {
    expect(formatCountdown(seconds)).toBe(text);
  });
});

describe('login messages', () => {
  const errorKeys: LoginErrorKey[] = [
    'invalidCredentials',
    'tooManyAttempts',
    'invalidInput',
    'network',
    'unexpected',
  ];
  const fieldKeys: LoginFieldErrorKey[] = [
    'emailRequired',
    'emailInvalid',
    'emailTooLong',
    'passwordRequired',
    'passwordTooLong',
  ];

  it.each([
    ['es', es],
    ['en', en],
  ])('%s.json translates every error key', (_locale, messages) => {
    for (const key of errorKeys) expect(messages.Login.errors[key]).toBeTruthy();
    for (const key of fieldKeys) expect(messages.Login.validation[key]).toBeTruthy();
  });

  it('the 429 message shows the countdown in both languages', () => {
    for (const messages of [es, en]) {
      expect(messages.Login.errors.tooManyAttempts).toContain('<countdown>{time}</countdown>');
    }
  });
});
