'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { getAuthClient } from './browser-auth-client';
import { LOADING_SESSION } from './session-store';

const getServerSnapshot = () => LOADING_SESSION;

/**
 * Client-side session for the whole app. The server render and hydration see
 * "loading"; the session is resolved in the browser after mount (there is no
 * authenticated SSR: the Next server never receives the API's cookie).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getAuthClient();
  const queryClient = useQueryClient();
  const session = useSyncExternalStore(
    client.store.subscribe,
    client.store.getState,
    getServerSnapshot,
  );

  useEffect(() => {
    const disconnect = client.connect();
    void client.bootstrap();
    return disconnect;
  }, [client]);

  useEffect(() => {
    // Drop cached server data when the session ends so the next user never sees it.
    if (session.status === 'anonymous') queryClient.clear();
  }, [session.status, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session.status,
      user: session.user,
      login: client.login,
      logout: client.logout,
      authFetch: client.authFetch,
    }),
    [session.status, session.user, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
