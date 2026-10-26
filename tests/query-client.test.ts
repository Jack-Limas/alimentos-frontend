import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { shouldRetry } from '@/providers/query-client';

describe('shouldRetry', () => {
  it('never retries 4xx API errors', () => {
    expect(shouldRetry(0, new ApiError(404, 'NOT_FOUND', 'Missing'))).toBe(false);
    expect(shouldRetry(0, new ApiError(401, 'UNAUTHENTICATED', 'Login'))).toBe(false);
  });

  it('retries server and network errors up to two times', () => {
    const serverError = new ApiError(503, 'AI_UNAVAILABLE', 'Down');

    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, serverError)).toBe(true);
    expect(shouldRetry(2, serverError)).toBe(false);
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true);
  });
});
