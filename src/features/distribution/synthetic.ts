import {
  addDays,
  type CalendarDate,
  type DistributionSnapshot,
  type OrderPriority,
} from './engine';

export const SYNTHETIC_MIN_ORDERS = 1_000;
export const SYNTHETIC_MAX_ORDERS = 20_000;
export const SYNTHETIC_DEFAULT_SEED = 20_261_028;

/** mulberry32: tiny seeded PRNG in [0, 1). Same seed, same sequence, everywhere. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const PRIORITIES: readonly OrderPriority[] = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'HIGH', 'URGENT'];
const UNITS = ['KG', 'L', 'UNIT', 'BOX'] as const;

export interface SyntheticOptions {
  orders: number;
  seed?: number;
  businessDate?: CalendarDate;
}

/**
 * A deterministic snapshot for the performance lab: `orders` PENDING orders
 * (clamped to 1,000–20,000) with 1–4 items over a catalog that grows with the
 * size, and 1–4 lots per product with expiries from yesterday to 45 days.
 * No Date.now() or Math.random(): the same options always give the same data.
 */
export function generateSnapshot({
  orders,
  seed = SYNTHETIC_DEFAULT_SEED,
  businessDate = '2026-10-28',
}: SyntheticOptions): DistributionSnapshot {
  const count = Math.min(SYNTHETIC_MAX_ORDERS, Math.max(SYNTHETIC_MIN_ORDERS, Math.round(orders)));
  const random = seededRandom(seed);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const productCount = Math.min(400, Math.max(50, Math.round(count / 40)));
  const base = Date.parse(`${businessDate}T12:00:00.000Z`);

  const products = Array.from({ length: productCount }, (_, i) => ({
    id: `p-${String(i + 1)}`,
    unit: UNITS[i % UNITS.length] ?? 'KG',
    avgDailyOut30d: int(0, 40) / 2,
  }));

  const lots = products.flatMap((product) =>
    Array.from({ length: int(1, 4) }, (_, j) => ({
      id: `${product.id}-l${String(j + 1)}`,
      productId: product.id,
      // Enough stock overall to serve most orders, with partial and missing stock too.
      quantity: int(0, 40) * 25,
      expiryDate: addDays(businessDate, int(-1, 45)),
      receivedAt: new Date(base - int(1, 30) * 86_400_000).toISOString(),
    })),
  );

  const pending = Array.from({ length: count }, (_, i) => {
    const used = new Set<number>();
    const items = Array.from({ length: int(1, 4) }, (_, k) => {
      let index = int(0, productCount - 1);
      while (used.has(index)) index = (index + 1) % productCount;
      used.add(index);
      return {
        id: `o-${String(i + 1)}-i${String(k + 1)}`,
        productId: products[index]?.id ?? 'p-1',
        requestedQty: int(1, 120) / 2,
      };
    });
    return {
      id: `o-${String(i + 1)}`,
      number: i + 1,
      priority: PRIORITIES[int(0, PRIORITIES.length - 1)] ?? 'MEDIUM',
      dueDate: addDays(businessDate, int(-2, 14)),
      createdAt: new Date(base - int(1, 20 * 24 * 60) * 60_000).toISOString(),
      items,
    };
  });

  return { businessDate, orders: pending, lots, products };
}
