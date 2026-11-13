export const ROLES = ['ADMIN', 'OPERATOR'] as const;
export type Role = (typeof ROLES)[number];

/** Public user profile returned by the backend (never includes the password hash). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Seed account (real or demo): its password cannot be changed from the app. */
  isProtected: boolean;
  /** Signed in with a temporary password: the app only allows changing it. */
  mustChangePassword: boolean;
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

/** True when the user exists and has one of the roles. */
export function hasRole(user: AuthUser | null, roles: readonly Role[]): boolean {
  return user !== null && roles.includes(user.role);
}
