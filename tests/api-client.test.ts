import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, buildApiUrl, UNKNOWN_ERROR_CODE } from '@/lib/api';
import { EnvError, parseApiOrigin } from '@/lib/env';

const ORIGIN = 'https://api.example.com';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiError', () => {
  it('is built from a contract error response', async () => {
    const response = jsonResponse(409, {
      error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock', details: { lotId: 'l1' } },
    });

    const error = await ApiError.fromResponse(response);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.message).toBe('Not enough stock');
    expect(error.details).toEqual({ lotId: 'l1' });
    expect(error.isClientError).toBe(true);
  });

  it('defaults details to an empty object', () => {
    const error = ApiError.fromBody(404, { error: { code: 'NOT_FOUND', message: 'Missing' } });

    expect(error.details).toEqual({});
  });

  it('falls back to UNKNOWN_ERROR for bodies outside the contract', async () => {
    const response = new Response('<html>Bad gateway</html>', { status: 502 });

    const error = await ApiError.fromResponse(response);

    expect(error.code).toBe(UNKNOWN_ERROR_CODE);
    expect(error.status).toBe(502);
    expect(error.isClientError).toBe(false);
  });
});

describe('buildApiUrl', () => {
  it('joins the origin, /api/v1 and the path', () => {
    expect(buildApiUrl('/health/ready', ORIGIN)).toBe(`${ORIGIN}/api/v1/health/ready`);
  });

  it('adds the leading slash when missing', () => {
    expect(buildApiUrl('products', ORIGIN)).toBe(`${ORIGIN}/api/v1/products`);
  });
});

describe('parseApiOrigin', () => {
  it('accepts a bare origin', () => {
    expect(parseApiOrigin('http://localhost:4000')).toBe('http://localhost:4000');
  });

  it.each([
    [undefined, /missing required variable/],
    ['not a url', /absolute URL/],
    ['https://api.example.com/', /must not end with a slash/],
    ['https://api.example.com/api/v1', /origin only/],
    ['ftp://api.example.com', /http or https/],
  ])('rejects %s', (value, message) => {
    expect(() => parseApiOrigin(value)).toThrow(EnvError);
    expect(() => parseApiOrigin(value)).toThrow(message);
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('calls the API base URL with credentials and throws ApiError on errors', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', ORIGIN);
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'Bad' } })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/products')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${ORIGIN}/api/v1/products`);
    expect(init?.credentials).toBe('include');
  });

  it('returns the parsed JSON body on success', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', ORIGIN);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse(200, { status: 'ok' }))),
    );

    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' });
  });
});
