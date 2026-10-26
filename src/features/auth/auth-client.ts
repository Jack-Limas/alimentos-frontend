import { ApiError, apiFetch, type ApiRequestOptions } from '@/lib/api';
import { postRefresh, withBearer } from './api';
import type { AuthChannel } from './auth-channel';
import type { LockRunner } from './refresh-lock';
import type { SessionStore } from './session-store';

/** 401 codes that a fresh access token can fix. */
const RENEWABLE_CODES = new Set(['TOKEN_EXPIRED', 'UNAUTHENTICATED']);

function isRenewable(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 && RENEWABLE_CODES.has(error.code);
}

export interface AuthClientDeps {
  store: SessionStore;
  /** Tells the other tabs about new tokens and logouts. */
  channel: AuthChannel;
  /** Exclusive lock shared by every tab (navigator.locks "aiq-refresh"). */
  runExclusive: LockRunner;
}

/*
 * Why refreshes are coordinated:
 * the backend rotates the refresh token on every use and treats a second use
 * of an already rotated token as theft, revoking the whole family (every tab
 * gets logged out). The refresh cookie is shared by all tabs, so two refreshes
 * sent at the same time, from one tab or from two, would carry the same cookie
 * and trigger that reuse detection. Two layers prevent it:
 * 1. In the tab: one shared promise (single flight), so concurrent 401s cause
 *    one refresh call.
 * 2. Across tabs: the refresh runs inside navigator.locks "aiq-refresh". The
 *    tab that renews broadcasts the new access token on "aiq-auth"; a tab that
 *    was waiting for the lock sees its token already changed and reuses it
 *    instead of calling refresh. If the broadcast arrives late, the waiting tab
 *    refreshes with the cookie the first tab already rotated: one extra
 *    rotation, never a reuse.
 * A SharedWorker that owns the session for every tab replaces this in phase 5.
 */
export function createAuthClient({ store, channel, runExclusive }: AuthClientDeps) {
  // Single flight: every 401 in this tab while a refresh is running awaits the same promise.
  let refreshInFlight: Promise<string | null> | null = null;

  async function runRefresh(staleToken: string | null): Promise<string | null> {
    // Inside the lock: another tab (or an earlier refresh here) may have renewed already.
    const current = store.getState().accessToken;
    if (current !== null && current !== staleToken) return current;

    try {
      const { accessToken } = await postRefresh();
      store.updateAccessToken(accessToken);
      channel.post({ type: 'session', accessToken, user: store.getState().user });
      return accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The refresh cookie is missing, expired or revoked: the session is over.
        store.clear();
        return null;
      }
      // Network or server failure: keep the session and let the caller report it.
      throw error;
    }
  }

  /**
   * Renews the access token that `staleToken` was rejected with. Resolves to
   * null when the session cannot be renewed.
   */
  function refreshAccessToken(staleToken: string | null): Promise<string | null> {
    refreshInFlight ??= runExclusive(() => runRefresh(staleToken)).finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  /**
   * apiFetch with `Authorization: Bearer`. On a renewable 401 it refreshes once
   * and retries the original request once; a second 401 ends the session.
   */
  async function authFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const usedToken = store.getState().accessToken;
    try {
      return await apiFetch<T>(path, withBearer(options, usedToken));
    } catch (error) {
      if (!isRenewable(error)) throw error;
      const renewed = await refreshAccessToken(usedToken);
      if (renewed === null) throw error;
      try {
        return await apiFetch<T>(path, withBearer(options, renewed));
      } catch (retryError) {
        if (isRenewable(retryError)) store.clear();
        throw retryError;
      }
    }
  }

  return { store, authFetch, refreshAccessToken };
}

export type AuthClient = ReturnType<typeof createAuthClient>;
