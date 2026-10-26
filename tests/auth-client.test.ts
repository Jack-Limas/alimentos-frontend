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

/** The same tab after a reload: a new client that inherits the sessionStorage copy. */
function reload(tab: ReturnType<typeof createTab>) {
  const reloaded = createTab(createChannelHub());
  for (const [key, value] of tab.storage.items) reloaded.storage.setItem(key, value);
  return reloaded;
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

describe('bootstrap', () => {
  it('uses the sessionStorage copy and GET /me without refreshing', async () => {
    const tab = createTab(createChannelHub());
    await tab.client.login(credentials);
    const reloaded = reload(tab);

    await reloaded.client.bootstrap();

    expect(reloaded.client.store.getState()).toEqual({
      status: 'authenticated',
      user: DEMO_USER,
      accessToken: 'access-1',
    });
    expect(backend.count('/auth/refresh')).toBe(0);
  });

  it('refreshes and retries /me when the copied token expired', async () => {
    const reloaded = reload(await loggedInTabWithExpiredToken());

    await reloaded.client.bootstrap();

    expect(reloaded.client.store.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'access-2',
    });
    expect(backend.count('/auth/refresh')).toBe(1);
  });

  it('restores a new tab without a copy from the refresh cookie', async () => {
    await loggedInTabWithExpiredToken();
    const newTab = createTab(createChannelHub());

    await newTab.client.bootstrap();

    expect(newTab.client.store.getState()).toMatchObject({
      status: 'authenticated',
      user: DEMO_USER,
    });
    expect(newTab.storage.items.has(SESSION_STORAGE_KEY)).toBe(true);
  });

  it('ends anonymous when there is neither a copy nor a valid cookie', async () => {
    backend.state.cookie = null;
    const { client, storage } = createTab(createChannelHub());

    await client.bootstrap();

    expect(client.store.getState().status).toBe('anonymous');
    expect(storage.items.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('ends anonymous and clears the copy when the copy and the cookie are both dead', async () => {
    const reloaded = reload(await loggedInTabWithExpiredToken());
    backend.state.validRefresh = null;

    await reloaded.client.bootstrap();

    expect(reloaded.client.store.getState().status).toBe('anonymous');
    expect(reloaded.storage.items.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('ends anonymous when the API is unreachable', async () => {
    backend.state.failRefreshWithNetworkError = true;
    const { client } = createTab(createChannelHub());

    await client.bootstrap();

    expect(client.store.getState().status).toBe('anonymous');
  });

  it('runs once even when called twice (React Strict Mode)', async () => {
    const tab = createTab(createChannelHub());
    await tab.client.login(credentials);
    const reloaded = reload(tab);

    await Promise.all([reloaded.client.bootstrap(), reloaded.client.bootstrap()]);

    expect(backend.count('/auth/me')).toBe(1);
  });
});
