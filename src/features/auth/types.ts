export const ROLES = ['ADMIN', 'OPERATOR'] as const;
export type Role = (typeof ROLES)[number];

/** Public user profile returned by the backend (never includes the password hash). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  data: AuthUser;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';
