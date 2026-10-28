// COPY of alimentos-backend src/modules/inventory/domain/quantity.ts (no shared code).
/**
 * Quantities are Decimal(12,3) in the database and numbers in JSON. Adding
 * floats directly drifts (0.1 + 0.2 !== 0.3), so the domain does arithmetic in
 * integer thousandths ("milli units"). The largest Decimal(12,3) value,
 * 999 999 999.999, is 999 999 999 999 milli units: far below 2^53.
 */
export const QTY_SCALE = 1000;
export const MAX_QTY = 999_999_999.999;

export function toMilli(qty: number): number {
  return Math.round(qty * QTY_SCALE);
}

export function fromMilli(milli: number): number {
  return milli / QTY_SCALE;
}

/** Rounds to the 3 decimals the database keeps. */
export function roundQty(qty: number): number {
  return fromMilli(toMilli(qty));
}
