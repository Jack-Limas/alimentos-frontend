import type { DistributionReason, DistributionReasonCode } from './engine';

/** Params of each plan reason (contract 4.7, point 5). */
export const PLAN_REASON_PARAMS: Readonly<Record<DistributionReasonCode, readonly string[]>> =
  Object.freeze({
    PRIORITY_LOW: [],
    PRIORITY_MEDIUM: [],
    PRIORITY_HIGH: [],
    PRIORITY_URGENT: [],
    DUE_IN_DAYS: ['days'],
    OVERDUE: ['days'],
    EXPIRES_IN_DAYS: ['days'],
    PARTIAL_STOCK: ['requested', 'allocated'],
    NO_STOCK: ['requested'],
  });

export type PlanReasonKey = DistributionReasonCode | 'UNKNOWN';

/**
 * A plan reason as a key of Distribution.reasons and its values, with the
 * translated unit for quantities. Unknown codes get a generic message.
 */
export function planReasonMessage(
  reason: { code: string; params: Record<string, unknown> },
  unitLabel: string,
): { key: PlanReasonKey; values: Record<string, number | string> } {
  if (!(reason.code in PLAN_REASON_PARAMS)) return { key: 'UNKNOWN', values: {} };
  const code = reason.code as DistributionReason['code'];
  const values: Record<string, number | string> = { unit: unitLabel };
  for (const name of PLAN_REASON_PARAMS[code]) {
    const value = reason.params[name];
    values[name] = typeof value === 'number' ? value : 0;
  }
  return { key: code, values };
}
