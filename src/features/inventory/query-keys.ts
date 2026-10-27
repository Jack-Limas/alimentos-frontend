/**
 * TanStack Query keys. Every key starts with its domain, so a write can
 * invalidate a whole domain (`['products']`) or one entry.
 */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (query: string) => [...productKeys.lists(), query] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  /** Every product id → name and unit, for the movements table. */
  index: () => [...productKeys.all, 'index'] as const,
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  summary: () => [...inventoryKeys.all, 'summary'] as const,
  movements: (query: string) => [...inventoryKeys.all, 'movements', query] as const,
};

/**
 * What a stock write (entry or exit) makes stale: product metrics and lots,
 * the summary and the movement list.
 */
export const STOCK_WRITE_INVALIDATES = [productKeys.all, inventoryKeys.all] as const;

/** A product create or edit changes lists, details and the summary counts. */
export const PRODUCT_WRITE_INVALIDATES = [productKeys.all, inventoryKeys.summary()] as const;
