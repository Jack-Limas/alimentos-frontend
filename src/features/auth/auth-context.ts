import { createContext } from 'react';
import type { AuthClient } from './auth-client';
import type { AuthUser, SessionStatus } from './types';

/** What components see of the session. The access token itself stays out of React. */
export interface AuthContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  login: AuthClient['login'];
  logout: AuthClient['logout'];
  /** apiFetch with Bearer and transparent refresh, for TanStack Query functions. */
  authFetch: AuthClient['authFetch'];
}

export const AuthContext = createContext<AuthContextValue | null>(null);
