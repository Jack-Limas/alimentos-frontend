import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STORAGE_KEY } from '@/features/auth/session-store';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import {
  API_ORIGIN,
  createFakeAuthBackend,
  DEMO_PASSWORD,
  DEMO_USER,
  type FakeAuthBackend,
} from './helpers/fake-auth-backend';
import { createChannelHub, createTab } from './helpers/tabs';

let backend: FakeAuthBackend;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', API_ORIGIN);
  backend = createFakeAuthBackend();
  vi.stubGlobal('fetch', backend.fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const credentials = { email: DEMO_USER.email, password: DEMO_PASSWORD };

/** A tab already logged in whose access token has just expired. */
async function loggedInTabWithExpiredToken() {
  const tab = createTab(createChannelHub());
  await tab.client.login(credentials);
  backend.expireAccessTokens();
  return tab;
}

describe('authFetch', () => {
  it('sends the access token as a Bearer header with credentials included', async () => {
    const { client } = createTab(createChannelHub());
    await client.login(credentials);

    await client.authFetch('/products');

    const request = backend.fetchMock.mock.calls.at(-1);
    expect(new Headers(request?.[1]?.headers).get('Authorization')).toBe('Bearer access-1');
    expect(request?.[1]?.credentials).toBe('include');
  });

  it('refreshes once for two concurrent 401s and retries both requests', async () => {
    const { client } = await loggedInTabWithExpiredToken();

    const [first, second] = await Promise.all([
      client.authFetch<{ token: string }>('/products'),
      client.authFetch<{ token: string }>('/orders'),
    ]);

    expect(backend.count('/auth/refresh')).toBe(1);
    expect(first.token).toBe('access-2');
    expect(second.token).toBe('access-2');
    expect(backend.count('/products')).toBe(2);
    expect(backend.count('/orders')).toBe(2);
    expect(backend.state.reuseDetected).toBe(false);
    expect(client.store.getState().accessToken).toBe('access-2');
  });

  it('ends the session and clears sessionStorage when the refresh fails', async () => {
    const { client, storage } = await loggedInTabWithExpiredToken();
    backend.state.validRefresh = null; // e.g. the refresh token expired

    await expect(client.authFetch('/products')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_EXPIRED',
    });
    expect(client.store.getState()).toEqual({
      status: 'anonymous',
      user: null,
      accessToken: null,
    });
    expect(storage.items.has(SESSION_STORAGE_KEY)).toBe(false);
    expect(backend.count('/products')).toBe(1);
  });

  it('keeps the session when the refresh fails because of the network', async () => {
    const { client } = await loggedInTabWithExpiredToken();
    backend.state.failRefreshWithNetworkError = true;

    await expect(client.authFetch('/products')).rejects.toMatchObject({
      code: NETWORK_ERROR_CODE,
    });
    expect(client.store.getState().status).toBe('authenticated');
  });

  it('retries only once: a second 401 ends the session', async () => {
    const { client } = await loggedInTabWithExpiredToken();
    backend.state.rejectAllAccessTokens = true;

    await expect(client.authFetch('/products')).rejects.toBeInstanceOf(ApiError);
    expect(backend.count('/products')).toBe(2);
    expect(backend.count('/auth/refresh')).toBe(1);
    expect(client.store.getState().status).toBe('anonymous');
  });

  it('does not refresh on errors a new token cannot fix', async () => {
    const { client } = createTab(createChannelHub());
    await client.login(credentials);

    await expect(client.authFetch('/forbidden')).rejects.toMatchObject({ status: 403 });
    expect(backend.count('/auth/refresh')).toBe(0);
  });
});
