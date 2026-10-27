import { REASON_CODES, type Reason, type ReasonCode } from './types';

/** Params the backend sends with each reason code (contract, section 4.3). */
export const REASON_PARAMS: Readonly<Record<ReasonCode, readonly string[]>> = Object.freeze({
  OUT_OF_STOCK: ['minStock'],
  BELOW_MIN_STOCK: ['availableQty', 'minStock'],
  EXPIRES_IN_DAYS: ['days'],
  EXPIRED_STOCK: ['quantity'],
  NO_RECENT_OUTFLOW: ['windowDays'],
  COVERAGE_EXCEEDS_EXPIRY: ['coverageDays', 'daysToExpiry'],
});

export type ReasonMessageKey = ReasonCode | 'UNKNOWN';

export interface ReasonMessage {
  /** Key in the Reasons namespace. */
  key: ReasonMessageKey;
  values: Record<string, number | string>;
}

export function isKnownReason(code: string): code is ReasonCode {
  return (REASON_CODES as readonly string[]).includes(code);
}

/**
 * Turns a server reason (code + params) into a next-intl key and values. The
 * translated unit is added for the quantities. A code this version does not
 * know yet maps to a generic message instead of showing server text.
 */
export function reasonMessage(reason: Reason, unitLabel: string): ReasonMessage {
  if (!isKnownReason(reason.code)) return { key: 'UNKNOWN', values: {} };
  const values: Record<string, number | string> = { unit: unitLabel };
  for (const name of REASON_PARAMS[reason.code]) values[name] = reason.params[name] ?? 0;
  return { key: reason.code, values };
}
