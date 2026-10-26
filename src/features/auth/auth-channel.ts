import { ROLES, type AuthUser } from './types';

export const AUTH_CHANNEL_NAME = 'aiq-auth';

/**
 * Messages shared between tabs of this origin:
 * - `session`: a tab logged in or renewed the access token. `user` is null when
 *   only the token changed (a refresh before the profile was loaded).
 * - `logout`: the session ended; every tab drops it.
 */
export type AuthMessage =
  { type: 'session'; accessToken: string; user: AuthUser | null } | { type: 'logout' };

export interface AuthChannel {
  post(message: AuthMessage): void;
  subscribe(listener: (message: AuthMessage) => void): () => void;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    ROLES.includes(user.role as AuthUser['role'])
  );
}

/** Validates data received from another tab before trusting it. */
export function isAuthMessage(data: unknown): data is AuthMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Record<string, unknown>;
  if (message.type === 'logout') return true;
  return (
    message.type === 'session' &&
    typeof message.accessToken === 'string' &&
    message.accessToken.length > 0 &&
    (message.user === null || isAuthUser(message.user))
  );
}

/**
 * BroadcastChannel-backed channel. The underlying channel is created on first
 * use, so importing this module during the server render opens nothing. A
 * BroadcastChannel never delivers to its own sender, only to the other tabs.
 */
export function createBroadcastAuthChannel(name: string = AUTH_CHANNEL_NAME): AuthChannel {
  let channel: BroadcastChannel | null = null;

  function open(): BroadcastChannel | null {
    if (channel === null && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(name);
    }
    return channel;
  }

  return {
    post(message) {
      open()?.postMessage(message);
    },
    subscribe(listener) {
      const target = open();
      if (target === null) return () => {};
      const onMessage = (event: MessageEvent<unknown>) => {
        if (isAuthMessage(event.data)) listener(event.data);
      };
      target.addEventListener('message', onMessage);
      return () => {
        target.removeEventListener('message', onMessage);
      };
    },
  };
}
