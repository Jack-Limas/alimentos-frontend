import { apiFetch, type ApiRequestOptions } from '@/lib/api';
import type { LoginCredentials, LoginResponse, RefreshResponse } from './types';

export const AUTH_PATHS = {
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const;

/** Copies the request options adding `Authorization: Bearer` when there is a token. */
export function withBearer(
  options: ApiRequestOptions,
  accessToken: string | null,
): ApiRequestOptions {
  if (accessToken === null) return options;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return { ...options, headers };
}

/** The refresh token comes back as an HttpOnly cookie that JS never sees. */
export function postLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(AUTH_PATHS.login, { method: 'POST', json: credentials });
}

/** Sends only the refresh cookie (credentials: "include" in apiFetch). */
export function postRefresh(): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>(AUTH_PATHS.refresh, { method: 'POST' });
}

export function postLogout(): Promise<void> {
  return apiFetch<void>(AUTH_PATHS.logout, { method: 'POST' });
}
