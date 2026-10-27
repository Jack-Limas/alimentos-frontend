import { CATEGORIES, PRODUCT_STATUSES, type Category, type ProductStatus } from './types';

export const PRODUCTS_PAGE_SIZE = 12;
export const EXPIRING_OPTIONS = [3, 7, 14, 30] as const;
const MAX_EXPIRING_DAYS = 365;
const MAX_SEARCH_LENGTH = 120;

export type StockFilter = 'LOW' | 'OUT';

/** Product list filters as they live in the URL (`/app/products?...`). */
export interface ProductFilters {
  search?: string;
  category?: Category;
  stockStatus?: StockFilter;
  expiringWithinDays?: number;
  /** Not an API filter: applied in the browser (the dashboard waste KPI links here). */
  wasteRisk?: 'HIGH';
  status?: ProductStatus;
  page: number;
}

export const EMPTY_FILTERS: ProductFilters = { page: 1 };

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

function intIn(value: string | null, min: number, max: number): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number >= min && number <= max ? number : undefined;
}

/** Reads the filters from the URL; invalid values are dropped, not passed to the API. */
export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const search = params.get('search')?.trim().slice(0, MAX_SEARCH_LENGTH);
  const filters: ProductFilters = { page: intIn(params.get('page'), 1, 10_000) ?? 1 };
  if (search) filters.search = search;
  const category = oneOf(CATEGORIES, params.get('category'));
  if (category) filters.category = category;
  const stockStatus = oneOf(['LOW', 'OUT'] as const, params.get('stockStatus'));
  if (stockStatus) filters.stockStatus = stockStatus;
  const expiring = intIn(params.get('expiringWithinDays'), 0, MAX_EXPIRING_DAYS);
  if (expiring !== undefined) filters.expiringWithinDays = expiring;
  if (params.get('wasteRisk') === 'HIGH') filters.wasteRisk = 'HIGH';
  const status = oneOf(PRODUCT_STATUSES, params.get('status'));
  if (status) filters.status = status;
  return filters;
}

/** Writes the filters back to a query string, omitting defaults, in a stable order. */
export function serializeProductFilters(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
  if (filters.expiringWithinDays !== undefined) {
    params.set('expiringWithinDays', String(filters.expiringWithinDays));
  }
  if (filters.wasteRisk) params.set('wasteRisk', filters.wasteRisk);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** Changing any filter goes back to the first page; cleared filters are removed. */
export function withFilter(
  filters: ProductFilters,
  change: Partial<ProductFilters>,
): ProductFilters {
  const next: ProductFilters = { ...filters, ...change, page: change.page ?? 1 };
  for (const key of Object.keys(next) as (keyof ProductFilters)[]) {
    if (next[key] === undefined || next[key] === '') delete next[key];
  }
  return next;
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return serializeProductFilters({ ...filters, page: 1 }) !== '';
}

/**
 * Query string for GET /products. The waste filter is computed in the browser,
 * so it asks for every product (one page of up to 100) and pages locally.
 */
export function toProductsApiQuery(filters: ProductFilters, pageSize = PRODUCTS_PAGE_SIZE): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
  if (filters.expiringWithinDays !== undefined) {
    params.set('expiringWithinDays', String(filters.expiringWithinDays));
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.wasteRisk) {
    params.set('page', '1');
    params.set('pageSize', '100');
  } else {
    params.set('page', String(filters.page));
    params.set('pageSize', String(pageSize));
  }
  return params.toString();
}
