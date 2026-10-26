import { describe, expect, it, vi } from 'vitest';
import {
  createSessionStore,
  LOADING_SESSION,
  SESSION_STORAGE_KEY,
} from '@/features/auth/session-store';
import type { AuthUser } from '@/features/auth/types';
import { createMemoryStorage, throwingStorage } from './helpers/memory-storage';

const user: AuthUser = { id: 'u1', email: 'ana@example.com', name: 'Ana', role: 'OPERATOR' };

describe('session store', () => {
  it('starts loading with the stable server snapshot', () => {
    const store = createSessionStore(() => null);

    expect(store.getState()).toBe(LOADING_SESSION);
  });

  it('keeps the token in memory and copies it to sessionStorage under aiq.session', () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(() => storage);

    store.authenticate('token-1', user);

    expect(store.getState()).toEqual({ status: 'authenticated', user, accessToken: 'token-1' });
    expect(JSON.parse(storage.items.get(SESSION_STORAGE_KEY) ?? '')).toEqual({
      accessToken: 'token-1',
    });
    expect(store.readPersistedToken()).toBe('token-1');
  });

  it('updates the token without touching the status or the user', () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(() => storage);
    store.authenticate('token-1', user);

    store.updateAccessToken('token-2');

    expect(store.getState()).toMatchObject({
      status: 'authenticated',
      user,
      accessToken: 'token-2',
    });
    expect(store.readPersistedToken()).toBe('token-2');
  });

  it('clears memory and the stored copy, and notifies subscribers', () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(() => storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.authenticate('token-1', user);

    store.clear();

    expect(store.getState()).toEqual({ status: 'anonymous', user: null, accessToken: null });
    expect(storage.items.has(SESSION_STORAGE_KEY)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores a corrupt or foreign stored value', () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(() => storage);

    for (const raw of ['not json', '{"accessToken":42}', '{"accessToken":""}', 'null']) {
      storage.items.set(SESSION_STORAGE_KEY, raw);
      expect(store.readPersistedToken()).toBeNull();
    }
  });

  it('still works in memory when sessionStorage throws', () => {
    const store = createSessionStore(() => throwingStorage);

    expect(() => {
      store.authenticate('token-1', user);
    }).not.toThrow();
    expect(store.getState().accessToken).toBe('token-1');
    expect(store.readPersistedToken()).toBeNull();
    expect(() => {
      store.clear();
    }).not.toThrow();
  });
});
