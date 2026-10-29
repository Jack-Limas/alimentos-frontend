import { env } from '@/lib/env';
import { ApiError, NETWORK_ERROR_CODE } from './api-error';

export const API_PREFIX = '/api/v1';

/** Joins the backend origin, the /api/v1 prefix and a path starting with "/". */
export function buildApiUrl(path: string, origin: string = env.apiUrl): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${API_PREFIX}${normalizedPath}`;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Serialized as JSON when present. */
  json?: unknown;
}

/**
 * The raw response of a backend request, for bodies that are not JSON (report
 * downloads). Same cookies and error handling as apiFetch: a non-2xx answer
 * throws ApiError.
 */
export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { json, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Accept')) requestHeaders.set('Accept', 'application/json');
  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers: requestHeaders,
      credentials: 'include',
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
  } catch (error) {
    throw new ApiError(
      0,
      NETWORK_ERROR_CODE,
      error instanceof Error ? error.message : 'Network error',
    );
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }
  return response;
}

/**
 * Thin fetch wrapper for the backend. Always sends cookies (the refresh token
 * cookie is SameSite=None on the API domain) and turns contract errors into
 * ApiError. No auth logic yet.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiRequest(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
