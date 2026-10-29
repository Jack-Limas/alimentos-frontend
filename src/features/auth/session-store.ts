import type { AuthUser, SessionStatus } from './types';

/** sessionStorage key for the per-tab copy of the access token. */
export const SESSION_STORAGE_KEY = 'aiq.session';
/**
 * localStorage key of a boolean hint: "this browser signed in and has not
 * signed out". Never a token. Without it a page load skips /auth/refresh, so
 * anonymous visitors do not send a request that can only answer 401.
 */
export const SIGNED_IN_HINT_KEY = 'aiq.signedIn';

export interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  accessToken: string | null;
}

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** Returns the storage to use, or null when it is unavailable. */
export type StorageProvider = () => TokenStorage | null;

/** Stable snapshot for the server render and the first client render. */
export const LOADING_SESSION: SessionState = Object.freeze({
  status: 'loading',
  user: null,
  accessToken: null,
});

const ANONYMOUS_SESSION: SessionState = Object.freeze({
  status: 'anonymous',
  user: null,
  accessToken: null,
});

/** Accessing sessionStorage can throw (privacy settings, sandboxed iframes). */
export const browserSessionStorage: StorageProvider = () => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

/** localStorage is shared by the tabs, like the refresh cookie the hint stands for. */
export const browserLocalStorage: StorageProvider = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Session state for one tab. The access token lives in memory; a copy goes to
 * sessionStorage (scoped to the tab, cleared when it closes) so a reload does
 * not need a refresh. Never localStorage or JS cookies: the refresh token stays
 * in its HttpOnly cookie. Every storage call is wrapped in try/catch: without
 * storage the session still works, it just does not survive a reload.
 */
export function createSessionStore(
  getStorage: StorageProvider = browserSessionStorage,
  getHintStorage: StorageProvider = browserLocalStorage,
) {
  let state: SessionState = LOADING_SESSION;
  const listeners = new Set<() => void>();

  function emit(next: SessionState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  function persist(accessToken: string | null): void {
    try {
      const storage = getStorage();
      if (!storage) return;
      if (accessToken === null) {
        storage.removeItem(SESSION_STORAGE_KEY);
      } else {
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken }));
      }
    } catch {
      // Quota exceeded or storage disabled: keep the in-memory session only.
    }
  }

  function setHint(signedIn: boolean): void {
    try {
      const storage = getHintStorage();
      if (!storage) return;
      if (signedIn) storage.setItem(SIGNED_IN_HINT_KEY, '1');
      else storage.removeItem(SIGNED_IN_HINT_KEY);
    } catch {
      // Storage disabled: hasSignedInHint() then answers "maybe".
    }
  }

  return {
    getState(): SessionState {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** The token copied by a previous page load of this tab, if any. */
    readPersistedToken(): string | null {
      try {
        const raw = getStorage()?.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && 'accessToken' in parsed) {
          const { accessToken } = parsed as { accessToken: unknown };
          if (typeof accessToken === 'string' && accessToken.length > 0) return accessToken;
        }
        return null;
      } catch {
        return null;
      }
    },

    /**
     * False only when the hint storage works and holds no hint: then there is
     * no refresh cookie worth trying. Unknown (no storage) counts as "maybe".
     */
    hasSignedInHint(): boolean {
      try {
        const storage = getHintStorage();
        return storage === null || storage.getItem(SIGNED_IN_HINT_KEY) === '1';
      } catch {
        return true;
      }
    },

    authenticate(accessToken: string, user: AuthUser): void {
      persist(accessToken);
      setHint(true);
      emit({ status: 'authenticated', user, accessToken });
    },

    /** Swaps the token (after a refresh) without changing the status or the user. */
    updateAccessToken(accessToken: string): void {
      persist(accessToken);
      emit({ ...state, accessToken });
    },

    /** Ends the session in this tab and removes the stored copy. */
    clear(): void {
      persist(null);
      setHint(false);
      emit(ANONYMOUS_SESSION);
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
