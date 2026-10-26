import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAuthMessage } from '@/features/auth/auth-channel';
import { SESSION_STORAGE_KEY } from '@/features/auth/session-store';
import {
  API_ORIGIN,
  createFakeAuthBackend,
  DEMO_PASSWORD,
  DEMO_USER,
  type FakeAuthBackend,
} from './helpers/fake-auth-backend';
import { createChannelHub, createMutex, createTab, flush, noLock } from './helpers/tabs';

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

/** Two tabs of the same browser, both logged in, with expired access tokens. */
async function twoTabsWithExpiredTokens(lock = createMutex()) {
  const createChannel = createChannelHub();
  const first = createTab(createChannel, lock);
  const second = createTab(createChannel, lock);
  await first.client.login(credentials);
  await flush(); // the second tab receives the session broadcast
  backend.expireAccessTokens();
  return { first, second };
}

describe('refresh across tabs', () => {
  it('refreshes once when two tabs hit 401 at the same time, without triggering reuse', async () => {
    const { first, second } = await twoTabsWithExpiredTokens();

    const [a, b] = await Promise.all([
      first.client.authFetch<{ token: string }>('/products'),
      second.client.authFetch<{ token: string }>('/orders'),
    ]);

    expect(backend.count('/auth/refresh')).toBe(1);
    expect(backend.state.reuseDetected).toBe(false);
    expect(a.token).toBe('access-2');
    expect(b.token).toBe('access-2');
    expect(second.client.store.getState().accessToken).toBe('access-2');
  });

  it('without the lock, the same race revokes the session (why the lock exists)', async () => {
    const { first, second } = await twoTabsWithExpiredTokens(noLock);

    await Promise.allSettled([
      first.client.authFetch('/products'),
      second.client.authFetch('/orders'),
    ]);

    expect(backend.count('/auth/refresh')).toBe(2);
    expect(backend.state.reuseDetected).toBe(true);
  });

  it('shares a renewed token with tabs that were not refreshing', async () => {
    const { first, second } = await twoTabsWithExpiredTokens();

    await first.client.authFetch('/products');
    await flush();
    await second.client.authFetch('/orders');

    expect(second.client.store.getState().accessToken).toBe('access-2');
    expect(second.storage.getItem(SESSION_STORAGE_KEY)).toContain('access-2');
    expect(backend.count('/auth/refresh')).toBe(1);
  });
});

describe('login and logout across tabs', () => {
  it('a login in one tab authenticates the others', async () => {
    const createChannel = createChannelHub();
    const first = createTab(createChannel);
    const second = createTab(createChannel);
    second.client.store.clear();

    await first.client.login(credentials);
    await flush();

    expect(second.client.store.getState()).toEqual({
      status: 'authenticated',
      user: DEMO_USER,
      accessToken: 'access-1',
    });
  });

  it('a logout in one tab ends the session in every tab and clears their copies', async () => {
    const createChannel = createChannelHub();
    const first = createTab(createChannel);
    const second = createTab(createChannel);
    await first.client.login(credentials);
    await flush();

    await first.client.logout();
    await flush();

    for (const tab of [first, second]) {
      expect(tab.client.store.getState().status).toBe('anonymous');
      expect(tab.storage.items.has(SESSION_STORAGE_KEY)).toBe(false);
    }
    expect(backend.count('/auth/logout')).toBe(1);
  });

  it('a token-only broadcast does not revive a tab that is logged out', async () => {
    const createChannel = createChannelHub();
    const sender = createChannel();
    const tab = createTab(createChannel);
    tab.client.store.clear();

    sender.post({ type: 'session', accessToken: 'access-9', user: null });
    await flush();

    expect(tab.client.store.getState().status).toBe('anonymous');
  });

  it('stops listening after disconnect', async () => {
    const createChannel = createChannelHub();
    const first = createTab(createChannel);
    const second = createTab(createChannel);
    second.client.store.clear();
    second.disconnect();

    await first.client.login(credentials);
    await flush();

    expect(second.client.store.getState().status).toBe('anonymous');
  });
});

describe('isAuthMessage', () => {
  it('accepts the two message shapes', () => {
    expect(isAuthMessage({ type: 'logout' })).toBe(true);
    expect(isAuthMessage({ type: 'session', accessToken: 't', user: null })).toBe(true);
    expect(isAuthMessage({ type: 'session', accessToken: 't', user: DEMO_USER })).toBe(true);
  });

  it.each([
    null,
    'logout',
    { type: 'unknown' },
    { type: 'session', accessToken: '', user: null },
    { type: 'session', accessToken: 't' },
    { type: 'session', accessToken: 't', user: { ...DEMO_USER, role: 'ROOT' } },
  ])('rejects %j', (data) => {
    expect(isAuthMessage(data)).toBe(false);
  });
});
