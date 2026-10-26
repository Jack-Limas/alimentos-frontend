import { describe, expect, it } from 'vitest';
import { ApiError, parseRetryAfter } from '@/lib/api';

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');

  it('reads delta-seconds', () => {
    expect(parseRetryAfter('120', now)).toBe(120);
    expect(parseRetryAfter(' 0 ', now)).toBe(0);
  });

  it('reads an HTTP date relative to now and never goes negative', () => {
    expect(parseRetryAfter('Mon, 26 Oct 2026 12:01:30 GMT', now)).toBe(90);
    expect(parseRetryAfter('Mon, 26 Oct 2026 11:00:00 GMT', now)).toBe(0);
  });

  it('returns null when the header is missing or invalid', () => {
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('soon', now)).toBeNull();
    expect(parseRetryAfter('-5', now)).toBeNull();
  });
});

describe('ApiError.fromResponse with Retry-After', () => {
  it('keeps the seconds of a 429 response', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down' } }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '842' } },
    );

    const error = await ApiError.fromResponse(response);

    expect(error.code).toBe('TOO_MANY_REQUESTS');
    expect(error.retryAfterSeconds).toBe(842);
  });

  it('is null when the header is absent', async () => {
    const error = await ApiError.fromResponse(new Response(null, { status: 401 }));

    expect(error.retryAfterSeconds).toBeNull();
  });
});
