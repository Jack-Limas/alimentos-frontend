import { ApiError, NETWORK_ERROR_CODE } from './api-error';
import { buildApiUrl } from './client';

export const READINESS_PATH = '/health/ready';

export interface ReadinessResult {
  /** HTTP status: 200 when ready, 503 when the database is down. */
  httpStatus: number;
  ready: boolean;
  db: 'up' | 'down' | null;
  /** Round trip measured with performance.now(). */
  durationMs: number;
}

function readDb(body: unknown): ReadinessResult['db'] {
  if (typeof body === 'object' && body !== null && 'db' in body) {
    const db = (body as { db: unknown }).db;
    if (db === 'up' || db === 'down') return db;
  }
  return null;
}

/**
 * Calls GET /api/v1/health/ready from the browser. Unlike apiFetch, a 503 is a
 * valid answer here (degraded), so only network failures throw.
 */
export async function checkReadiness(origin?: string): Promise<ReadinessResult> {
  const url =
    origin === undefined ? buildApiUrl(READINESS_PATH) : buildApiUrl(READINESS_PATH, origin);
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  } catch (error) {
    throw new ApiError(
      0,
      NETWORK_ERROR_CODE,
      error instanceof Error ? error.message : 'Network error',
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON body: keep db as null.
  }
  const durationMs = performance.now() - startedAt;

  return {
    httpStatus: response.status,
    ready: response.ok,
    db: readDb(body),
    durationMs,
  };
}
