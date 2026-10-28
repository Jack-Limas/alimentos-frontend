import { describe, expect, it } from 'vitest';
import { compareRankings } from '@/features/distribution/compare';
import { checkWeights, type RankedOrder } from '@/features/distribution/engine';
import {
  degradedNotice,
  mapExplanationError,
  mapProposalError,
} from '@/features/distribution/proposal-errors';
import {
  normalizeWeights,
  presetOf,
  setWeight,
  WEIGHT_KEYS,
} from '@/features/distribution/weights';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe('weights', () => {
  const balanced = { priority: 40, deadlineUrgency: 35, expiryPressure: 25 };

  it('moving one slider rebalances the other two in proportion and keeps 100', () => {
    expect(setWeight(balanced, 'priority', 60)).toEqual({
      priority: 60,
      deadlineUrgency: 23,
      expiryPressure: 17,
    });
    expect(setWeight(balanced, 'expiryPressure', 100)).toEqual({
      priority: 0,
      deadlineUrgency: 0,
      expiryPressure: 100,
    });
  });

  it('shares evenly when the other two are 0, and clamps and rounds the input', () => {
    const allExpiry = { priority: 0, deadlineUrgency: 0, expiryPressure: 100 };
    expect(setWeight(allExpiry, 'expiryPressure', 41)).toEqual({
      priority: 30,
      deadlineUrgency: 29,
      expiryPressure: 41,
    });
    expect(setWeight(balanced, 'priority', 140).priority).toBe(100);
    expect(setWeight(balanced, 'priority', -3).priority).toBe(0);
    expect(setWeight(balanced, 'priority', 33.6).priority).toBe(34);
  });

  it('always gives whole numbers that the server accepts, for any slider move', () => {
    let weights = { ...balanced };
    for (let step = 0; step < 300; step += 1) {
      const key = WEIGHT_KEYS[step % 3]!;
      weights = setWeight(weights, key, (step * 37) % 101);
      expect(sum(weights)).toBe(100);
      expect(Object.values(weights).every(Number.isInteger)).toBe(true);
      expect(checkWeights(weights)).toBeNull();
    }
  });

  it('normalizes any non-negative weights to whole numbers adding up to 100', () => {
    expect(normalizeWeights({ priority: 1, deadlineUrgency: 1, expiryPressure: 1 })).toEqual({
      priority: 34,
      deadlineUrgency: 33,
      expiryPressure: 33,
    });
    expect(normalizeWeights({ priority: 2, deadlineUrgency: 6, expiryPressure: 2 })).toEqual({
      priority: 20,
      deadlineUrgency: 60,
      expiryPressure: 20,
    });
    expect(
      normalizeWeights({ priority: 0, deadlineUrgency: Number.NaN, expiryPressure: -5 }),
    ).toEqual(balanced);
  });

  it('recognizes the strategy presets', () => {
    expect(presetOf(balanced)).toBe('BALANCED');
    expect(presetOf({ priority: 20, deadlineUrgency: 70, expiryPressure: 10 })).toBe(
      'URGENCY_FIRST',
    );
    expect(presetOf({ priority: 21, deadlineUrgency: 69, expiryPressure: 10 })).toBeNull();
  });
});

describe('compareRankings', () => {
  const ranked = (...ids: string[]): RankedOrder[] =>
    ids.map((orderId, index) => ({
      orderId,
      number: index + 1,
      rank: index + 1,
      score: 50,
      components: { priority: 0.5, deadlineUrgency: 0.5, expiryPressure: 0 },
      status: 'FULL',
      rescores: 0,
    }));

  it('marks the orders that change place and how many places they gain', () => {
    const comparison = compareRankings(
      {
        BALANCED: ranked('a', 'b', 'c', 'd'),
        URGENCY_FIRST: ranked('a', 'c', 'b', 'd'),
        WASTE_FIRST: ranked('d', 'a', 'b', 'c'),
      },
      3,
    );

    expect(comparison.BALANCED.map((c) => [c.orderId, c.changed, c.shift])).toEqual([
      ['a', true, null],
      ['b', true, null],
      ['c', true, null],
    ]);
    expect(comparison.URGENCY_FIRST[1]).toEqual({ orderId: 'c', rank: 2, shift: 1, changed: true });
    expect(comparison.WASTE_FIRST[0]).toEqual({ orderId: 'd', rank: 1, shift: 3, changed: true });
  });

  it('does not mark an order that keeps its place everywhere', () => {
    const same = ranked('a', 'b');
    const comparison = compareRankings({ BALANCED: same, URGENCY_FIRST: same, WASTE_FIRST: same });
    expect(comparison.WASTE_FIRST.every((cell) => !cell.changed && cell.shift === 0)).toBe(true);
  });
});

describe('mapProposalError', () => {
  const stale = (reason: string) =>
    new ApiError(409, 'STALE_PROPOSAL', 'stale', { reason, lotId: 'l' });

  it.each([
    ['STOCK_CHANGED', 'stockChanged'],
    ['ORDER_CHANGED', 'orderChanged'],
    ['BUSINESS_DATE_CHANGED', 'businessDateChanged'],
    ['NOT_DRAFT', 'notDraft'],
  ])('translates STALE_PROPOSAL %s and offers to generate again', (reason, key) => {
    expect(mapProposalError(stale(reason))).toEqual({ key, regenerate: true });
  });

  it('translates the other failures without offering to regenerate', () => {
    expect(
      mapProposalError(new ApiError(400, 'VALIDATION_ERROR', 'x', { field: 'weights' })),
    ).toEqual({
      key: 'invalidWeights',
      regenerate: false,
    });
    expect(mapProposalError(new ApiError(0, NETWORK_ERROR_CODE, 'offline')).key).toBe('network');
    expect(mapProposalError(new ApiError(403, 'FORBIDDEN', 'x')).key).toBe('forbidden');
    expect(mapProposalError(new ApiError(404, 'NOT_FOUND', 'x')).key).toBe('notFound');
    expect(mapProposalError(new ApiError(409, 'INVALID_STATUS_TRANSITION', 'x'))).toEqual({
      key: 'notDraft',
      regenerate: true,
    });
    expect(mapProposalError(new Error('boom')).key).toBe('unexpected');
  });
});

describe('degraded mode and AI explanation errors', () => {
  it('explains why AI_ASSISTED fell back to BALANCED', () => {
    const summary = (aiError?: string) => ({ summary: { aiError } as never, degraded: true });
    expect(degradedNotice({ ...summary('NOT_CONFIGURED') })).toBe('notConfigured');
    expect(degradedNotice({ ...summary('TIMEOUT') })).toBe('timeout');
    expect(degradedNotice({ ...summary('QUOTA_EXCEEDED') })).toBe('quota');
    expect(degradedNotice({ ...summary('UPSTREAM_ERROR') })).toBe('unavailable');
    expect(degradedNotice({ degraded: false, summary: {} as never })).toBeNull();
  });

  it('shows "AI not available" for 404, 503 and network errors', () => {
    expect(
      mapExplanationError(new ApiError(503, 'AI_UNAVAILABLE', 'x', { category: 'TIMEOUT' })),
    ).toBe('unavailable');
    expect(mapExplanationError(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('unavailable');
    expect(mapExplanationError(new ApiError(0, NETWORK_ERROR_CODE, 'x'))).toBe('unavailable');
    expect(mapExplanationError(new ApiError(429, 'TOO_MANY_REQUESTS', 'x'))).toBe('busy');
    expect(mapExplanationError(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe('unexpected');
  });
});
