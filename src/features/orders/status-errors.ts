import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';

/** i18n keys of the Orders.statusErrors namespace. */
export type StatusErrorKey =
  | 'requiresProposal'
  | 'notAllowed'
  | 'statusChanged'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'unexpected';

/**
 * Translates a failed PATCH /orders/:id/status. A 409 says why in
 * details.reason; the server message is never shown.
 */
export function mapStatusError(error: unknown): StatusErrorKey {
  if (!(error instanceof ApiError)) return 'unexpected';
  if (error.code === NETWORK_ERROR_CODE) return 'network';
  if (error.status === 403) return 'forbidden';
  if (error.status === 404) return 'notFound';
  if (error.code === 'INVALID_STATUS_TRANSITION') {
    switch (error.details.reason) {
      case 'REQUIRES_PROPOSAL':
        return 'requiresProposal';
      case 'STATUS_CHANGED':
        return 'statusChanged';
      default:
        return 'notAllowed';
    }
  }
  return 'unexpected';
}
