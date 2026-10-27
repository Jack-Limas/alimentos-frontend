/** Same thresholds as the backend (EXPIRY_WARNING_DAYS and the critical alert days). */
export const FRESHNESS_RULES = Object.freeze({
  WARNING_DAYS: 7,
  CRITICAL_DAYS: 2,
  /** Shelf life assumed when the lot's own life is unknown (e.g. a product's nearest expiry). */
  DEFAULT_LIFE_DAYS: 30,
  /** A lot that is still usable never looks empty. */
  MIN_VISIBLE_FILL: 0.06,
});

export type FreshnessLevel = 'fresh' | 'warning' | 'critical' | 'expired' | 'unknown';

export interface Freshness {
  level: FreshnessLevel;
  /** Share of the bar that is filled, from 0 to 1. */
  fill: number;
  /** Days left (negative once expired); null without an expiry date. */
  daysLeft: number | null;
}

export interface FreshnessInput {
  /** Days from today to the expiry date; null when there is no lot with stock. */
  daysLeft: number | null;
  /** Days from reception to expiry, when known. */
  lifeDays?: number | null;
}

/**
 * Health bar of a lot: it empties as the expiry date gets closer. A lot that
 * expires today is still usable (critical, not expired); it is expired once
 * the date has passed, like in the backend.
 */
export function freshness({ daysLeft, lifeDays }: FreshnessInput): Freshness {
  if (daysLeft === null) return { level: 'unknown', fill: 0, daysLeft: null };
  if (daysLeft < 0) return { level: 'expired', fill: 0, daysLeft };

  const life = lifeDays && lifeDays > 0 ? lifeDays : FRESHNESS_RULES.DEFAULT_LIFE_DAYS;
  const ratio = Math.min(1, daysLeft / Math.max(life, daysLeft, 1));
  const fill = Math.max(FRESHNESS_RULES.MIN_VISIBLE_FILL, ratio);

  const level: FreshnessLevel =
    daysLeft <= FRESHNESS_RULES.CRITICAL_DAYS
      ? 'critical'
      : daysLeft <= FRESHNESS_RULES.WARNING_DAYS
        ? 'warning'
        : 'fresh';
  return { level, fill: Math.round(fill * 1000) / 1000, daysLeft };
}

/** Number of lit segments in a bar of `segments` cells (at least one while usable). */
export function litSegments(state: Freshness, segments = 10): number {
  if (state.level === 'expired' || state.level === 'unknown') return 0;
  return Math.max(1, Math.round(state.fill * segments));
}
