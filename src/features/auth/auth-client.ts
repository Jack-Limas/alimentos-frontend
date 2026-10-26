import { ApiError, apiFetch, type ApiRequestOptions } from '@/lib/api';
import { postRefresh, withBearer } from './api';
import type { SessionStore } from './session-store';

/** 401 codes that a fresh access token can fix. */
const RENEWABLE_CODES = new Set(['TOKEN_EXPIRED', 'UNAUTHENTICATED']);

function isRenewable(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 && RENEWABLE_CODES.has(error.code);
}

export interface AuthClientDeps {
  store: SessionStore;
}

export function createAuthClient({ store }: AuthClientDeps) {
  // Single flight: every 401 in this tab while a refresh is running awaits the same promise.
  let refreshInFlight: Promise<string | null> | null = null;

  async function runRefresh(): Promise<string | null> {
    try {
      const { accessToken } = await postRefresh();
      store.updateAccessToken(accessToken);
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

  /** Renews the access token. Resolves to null when the session cannot be renewed. */
  function refreshAccessToken(): Promise<string | null> {
    refreshInFlight ??= runRefresh().finally(() => {
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
      const renewed = await refreshAccessToken();
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
