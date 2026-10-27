import { describe, expect, it } from 'vitest';
import { FRESHNESS_RULES, freshness, litSegments } from '@/features/inventory/freshness';

describe('freshness', () => {
  it('is unknown without an expiry date', () => {
    const state = freshness({ daysLeft: null });
    expect(state).toEqual({ level: 'unknown', fill: 0, daysLeft: null });
    expect(litSegments(state)).toBe(0);
  });

  it('is expired once the date has passed, with an empty bar', () => {
    const state = freshness({ daysLeft: -1, lifeDays: 10 });
    expect(state).toEqual({ level: 'expired', fill: 0, daysLeft: -1 });
    expect(litSegments(state)).toBe(0);
  });

  it('is critical, not expired, on the expiry day, and still shows a sliver', () => {
    const state = freshness({ daysLeft: 0, lifeDays: 10 });
    expect(state.level).toBe('critical');
    expect(state.fill).toBe(FRESHNESS_RULES.MIN_VISIBLE_FILL);
    expect(litSegments(state)).toBe(1);
  });

  it.each([
    [1, 'critical'],
    [2, 'critical'],
    [3, 'warning'],
    [7, 'warning'],
    [8, 'fresh'],
    [300, 'fresh'],
  ] as const)('%i days left is %s', (daysLeft, level) => {
    expect(freshness({ daysLeft, lifeDays: 365 }).level).toBe(level);
  });

  it('fills in proportion to the lot life', () => {
    expect(freshness({ daysLeft: 5, lifeDays: 10 }).fill).toBe(0.5);
    expect(freshness({ daysLeft: 10, lifeDays: 10 }).fill).toBe(1);
    expect(litSegments(freshness({ daysLeft: 5, lifeDays: 10 }))).toBe(5);
  });

  it('uses a default life when unknown and never overflows', () => {
    expect(freshness({ daysLeft: 15 }).fill).toBe(0.5);
    expect(freshness({ daysLeft: 40, lifeDays: 10 }).fill).toBe(1);
    expect(freshness({ daysLeft: 3, lifeDays: 0 }).fill).toBe(0.1);
  });
});
