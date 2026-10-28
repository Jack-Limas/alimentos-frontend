import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import type { ProposalDto } from './types';

/** i18n keys of the Distribution.errors namespace. */
export type ProposalErrorKey =
  | 'stockChanged'
  | 'orderChanged'
  | 'notDraft'
  | 'businessDateChanged'
  | 'invalidWeights'
  | 'forbidden'
  | 'notFound'
  | 'network'
  | 'unexpected';

export interface ProposalErrorView {
  key: ProposalErrorKey;
  /** The plan no longer matches the warehouse: offer "Generate again". */
  regenerate: boolean;
}

/**
 * Translates a failed generate / confirm / discard. A 409 STALE_PROPOSAL says
 * why in details.reason (contract 4.7); the server message is never shown.
 */
export function mapProposalError(error: unknown): ProposalErrorView {
  const view = (key: ProposalErrorKey, regenerate = false) => ({ key, regenerate });
  if (!(error instanceof ApiError)) return view('unexpected');
  if (error.code === NETWORK_ERROR_CODE) return view('network');
  if (error.status === 403) return view('forbidden');
  if (error.status === 404) return view('notFound');
  if (error.code === 'VALIDATION_ERROR' && error.details.field === 'weights') {
    return view('invalidWeights');
  }
  if (error.code === 'STALE_PROPOSAL') {
    switch (error.details.reason) {
      case 'STOCK_CHANGED':
        return view('stockChanged', true);
      case 'ORDER_CHANGED':
        return view('orderChanged', true);
      case 'BUSINESS_DATE_CHANGED':
        return view('businessDateChanged', true);
      default:
        return view('notDraft', true);
    }
  }
  // Discarding something that is no longer a DRAFT.
  if (error.code === 'INVALID_STATUS_TRANSITION') return view('notDraft', true);
  return view('unexpected');
}

/** i18n keys of Distribution.degraded: why AI_ASSISTED fell back to BALANCED. */
export type DegradedKey = 'notConfigured' | 'timeout' | 'quota' | 'unavailable';

/** null when the proposal is not degraded. */
export function degradedNotice(
  proposal: Pick<ProposalDto, 'degraded' | 'summary'>,
): DegradedKey | null {
  if (!proposal.degraded) return null;
  switch (proposal.summary.aiError) {
    case 'NOT_CONFIGURED':
      return 'notConfigured';
    case 'TIMEOUT':
      return 'timeout';
    case 'QUOTA_EXCEEDED':
      return 'quota';
    default:
      return 'unavailable';
  }
}

/** i18n keys of Distribution.explanation errors. */
export type ExplanationErrorKey = 'unavailable' | 'busy' | 'unexpected';

/**
 * The AI card never breaks the screen: 404, 503 (any category) and network
 * errors are "AI not available for now"; 429 is "too many requests".
 */
export function mapExplanationError(error: unknown): ExplanationErrorKey {
  if (!(error instanceof ApiError)) return 'unexpected';
  if (error.status === 429) return 'busy';
  if (error.code === NETWORK_ERROR_CODE || error.status === 404 || error.status === 503) {
    return 'unavailable';
  }
  return 'unexpected';
}
