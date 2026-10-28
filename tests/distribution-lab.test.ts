import { describe, expect, it } from 'vitest';
import {
  approximateInp,
  labExport,
  longestFrame,
  longTaskStats,
} from '@/features/distribution/lab-metrics';
import { buildProposal, createStrategy } from '@/features/distribution/engine';
import {
  generateSnapshot,
  seededRandom,
  SYNTHETIC_MAX_ORDERS,
  SYNTHETIC_MIN_ORDERS,
} from '@/features/distribution/synthetic';

describe('synthetic snapshot generator', () => {
  it('is deterministic: same seed and size, same snapshot', () => {
    const a = generateSnapshot({ orders: 1000, seed: 42 });
    const b = generateSnapshot({ orders: 1000, seed: 42 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(generateSnapshot({ orders: 1000, seed: 43 }))).not.toBe(
      JSON.stringify(a),
    );
  });

  it('keeps the size between 1,000 and 20,000 orders', () => {
    expect(generateSnapshot({ orders: 10 }).orders).toHaveLength(SYNTHETIC_MIN_ORDERS);
    expect(generateSnapshot({ orders: 99_999 }).orders).toHaveLength(SYNTHETIC_MAX_ORDERS);
    expect(generateSnapshot({ orders: 10_000 }).orders).toHaveLength(10_000);
  });

  it('produces valid engine input: distinct products per order and positive quantities', () => {
    const snapshot = generateSnapshot({ orders: 2000, seed: 7 });
    const productIds = new Set(snapshot.products.map((p) => p.id));
    for (const order of snapshot.orders) {
      const ids = order.items.map((i) => i.productId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => productIds.has(id))).toBe(true);
      expect(order.items.every((i) => i.requestedQty > 0)).toBe(true);
    }
    const plan = buildProposal(snapshot, createStrategy('BALANCED'), { now: () => 0 });
    expect(plan.ranking).toHaveLength(2000);
    expect(plan.summary.ordersFull + plan.summary.ordersPartial + plan.summary.ordersUnserved).toBe(
      2000,
    );
  });

  it('seededRandom stays in [0, 1)', () => {
    const random = seededRandom(1);
    const values = Array.from({ length: 1000 }, random);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('lab metrics', () => {
  it('finds the longest frame, including the gaps at both ends of the run', () => {
    expect(longestFrame([16, 32, 48], 0, 64)).toEqual({ longestFrameMs: 16, frames: 3 });
    // The main thread was blocked: no frame at all for the whole run.
    expect(longestFrame([], 100, 1350.26)).toEqual({ longestFrameMs: 1250.3, frames: 0 });
  });

  it('counts long tasks and interactions inside the run window only', () => {
    const tasks = [
      { startTime: 5, duration: 900 },
      { startTime: 50, duration: 60 },
      { startTime: 5000, duration: 70 },
    ];
    expect(longTaskStats(tasks, 0, 1000)).toEqual({ count: 2, totalMs: 960 });

    const events = [
      { startTime: 10, duration: 24, interactionId: 0 },
      { startTime: 20, duration: 880, interactionId: 4 },
      { startTime: 30, duration: 40, interactionId: 5 },
    ];
    expect(approximateInp(events, 0, 1000)).toBe(880);
    expect(approximateInp(events, 900, 1000)).toBeNull();
  });

  it('exports the runs as JSON with the environment', () => {
    const json = JSON.parse(labExport([], { cores: 8 })) as Record<string, unknown>;
    expect(json).toEqual({
      tool: 'alimentaiq-performance-lab',
      version: 1,
      environment: { cores: 8 },
      runs: [],
    });
  });
});
