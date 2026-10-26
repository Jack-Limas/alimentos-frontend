import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import { checkReadiness } from '@/lib/api/health';

const ORIGIN = 'http://localhost:4000';

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('checkReadiness', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a ready backend with database up and a measured duration', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(Response.json({ status: 'ok', db: 'up' }, { status: 200 })),
    );

    const result = await checkReadiness(ORIGIN);

    expect(result).toMatchObject({ httpStatus: 200, ready: true, db: 'up' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${ORIGIN}/api/v1/health/ready`);
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('treats 503 as a degraded answer instead of an error', async () => {
    stubFetch(() =>
      Promise.resolve(Response.json({ status: 'degraded', db: 'down' }, { status: 503 })),
    );

    await expect(checkReadiness(ORIGIN)).resolves.toMatchObject({
      httpStatus: 503,
      ready: false,
      db: 'down',
    });
  });

  it('throws a NETWORK_ERROR ApiError when the request fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    const error = await checkReadiness(ORIGIN).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(NETWORK_ERROR_CODE);
  });
});
