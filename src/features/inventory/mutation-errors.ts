import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';

/** What a form shows after a failed write. The server message is never displayed. */
export type MutationErrorView =
  | { kind: 'insufficientStock'; available: number | null; requested: number | null }
  | { kind: 'duplicateName' }
  | { kind: 'notFound' }
  | { kind: 'invalid' }
  | { kind: 'forbidden' }
  | { kind: 'sessionExpired' }
  | { kind: 'network' }
  | { kind: 'unexpected' };

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function mapMutationError(error: unknown): MutationErrorView {
  if (!(error instanceof ApiError)) return { kind: 'unexpected' };
  if (error.code === NETWORK_ERROR_CODE) return { kind: 'network' };

  switch (error.code) {
    case 'INSUFFICIENT_STOCK':
      // details: { productId, requested, available } (or { lotId, ... } after a lost race).
      return {
        kind: 'insufficientStock',
        available: numberOrNull(error.details.available),
        requested: numberOrNull(error.details.requested),
      };
    case 'DUPLICATE':
      return { kind: 'duplicateName' };
    case 'NOT_FOUND':
      return { kind: 'notFound' };
    case 'VALIDATION_ERROR':
      return { kind: 'invalid' };
    case 'FORBIDDEN':
      return { kind: 'forbidden' };
    case 'UNAUTHENTICATED':
    case 'TOKEN_EXPIRED':
      return { kind: 'sessionExpired' };
    default:
      return { kind: 'unexpected' };
  }
}
