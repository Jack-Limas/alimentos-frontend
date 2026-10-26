import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
