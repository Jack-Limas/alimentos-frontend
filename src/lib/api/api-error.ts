export type ApiErrorDetails = Record<string, unknown>;

interface ErrorEnvelope {
  error: { code: string; message: string; details?: ApiErrorDetails };
}

/** Code used when the response is not in the contract error format. */
export const UNKNOWN_ERROR_CODE = 'UNKNOWN_ERROR';
/** Code used when the request never reached the server (offline, CORS, DNS). */
export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';

/**
 * Parses a Retry-After header: delta-seconds ("120") or an HTTP date. Returns
 * whole seconds from `now` (never negative), or null when absent or invalid.
 */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  // An HTTP date always has a weekday and month name; this rejects "-5", which Date.parse accepts.
  if (!/[a-z]/i.test(trimmed)) return null;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const error = (body as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/**
 * Error returned by the backend in the contract format
 * `{ error: { code, message, details } }`. The UI translates `code` with
 * next-intl; `message` is only for logs.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetails = {},
    /** Seconds from the Retry-After header (e.g. on 429), when the server sent one. */
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  static fromBody(
    status: number,
    body: unknown,
    retryAfterSeconds: number | null = null,
  ): ApiError {
    if (isErrorEnvelope(body)) {
      return new ApiError(
        status,
        body.error.code,
        body.error.message,
        body.error.details ?? {},
        retryAfterSeconds,
      );
    }
    return new ApiError(
      status,
      UNKNOWN_ERROR_CODE,
      `Unexpected response with status ${status}`,
      {},
      retryAfterSeconds,
    );
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body (e.g. a proxy HTML page): fall back to UNKNOWN_ERROR.
    }
    return ApiError.fromBody(
      response.status,
      body,
      parseRetryAfter(response.headers.get('Retry-After')),
    );
  }
}
