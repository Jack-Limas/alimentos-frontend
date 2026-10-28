import { isCalendarDate, type CalendarDate } from '@/lib/dates';
import { ORDER_PRIORITIES, ORDER_STATUSES, type OrderPriority, type OrderStatus } from './types';

export const ORDERS_PAGE_SIZE = 12;
/** Statuses whose goods have not left the warehouse. */
export const OPEN_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'IN_PREPARATION',
  'READY_FOR_DISPATCH',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order list filters as they live in the URL (`/app/orders?...`). */
export interface OrderFilters {
  /** Any of these statuses; empty means all. */
  statuses: OrderStatus[];
  priority?: OrderPriority;
  customerId?: string;
  /** Exclusive: orders due strictly before this date. */
  dueBefore?: CalendarDate;
  page: number;
}

export const EMPTY_ORDER_FILTERS: OrderFilters = { statuses: [], page: 1 };

/** Statuses in the canonical order, without repeats or unknown values. */
function normalizeStatuses(values: readonly string[]): OrderStatus[] {
  return ORDER_STATUSES.filter((status) => values.includes(status));
}

export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const statuses = normalizeStatuses(
    params
      .getAll('status')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim()),
  );
  const filters: OrderFilters = { statuses, page: 1 };
  const page = params.get('page');
  if (page !== null && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Number(page);
  const priority = params.get('priority');
  if (priority !== null && (ORDER_PRIORITIES as readonly string[]).includes(priority)) {
    filters.priority = priority as OrderPriority;
  }
  const customerId = params.get('customerId');
  if (customerId !== null && UUID.test(customerId)) filters.customerId = customerId;
  const dueBefore = params.get('dueBefore');
  if (dueBefore !== null && isCalendarDate(dueBefore)) filters.dueBefore = dueBefore;
  return filters;
}

export function serializeOrderFilters(filters: OrderFilters): string {
  const params = new URLSearchParams();
  const statuses = normalizeStatuses(filters.statuses);
  if (statuses.length > 0) params.set('status', statuses.join(','));
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.customerId) params.set('customerId', filters.customerId);
  if (filters.dueBefore) params.set('dueBefore', filters.dueBefore);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** Any change goes back to page 1 unless it is the page itself. */
export function withOrderFilter(
  filters: OrderFilters,
  change: Partial<OrderFilters>,
): OrderFilters {
  const next: OrderFilters = { ...filters, ...change, page: change.page ?? 1 };
  for (const key of ['priority', 'customerId', 'dueBefore'] as const) {
    if (next[key] === undefined || next[key] === '') delete next[key];
  }
  return next;
}

/** Adds or removes one status from the multi-select. */
export function toggleStatus(filters: OrderFilters, status: OrderStatus): OrderFilters {
  const statuses = filters.statuses.includes(status)
    ? filters.statuses.filter((value) => value !== status)
    : normalizeStatuses([...filters.statuses, status]);
  return withOrderFilter(filters, { statuses });
}

export function hasActiveOrderFilters(filters: OrderFilters): boolean {
  return serializeOrderFilters({ ...filters, page: 1 }) !== '';
}

/** Query string for GET /orders (status as a comma list, the API accepts it). */
export function toOrdersApiQuery(filters: OrderFilters, pageSize = ORDERS_PAGE_SIZE): string {
  const params = new URLSearchParams(serializeOrderFilters({ ...filters, page: 1 }));
  params.set('page', String(filters.page));
  params.set('pageSize', String(pageSize));
  return params.toString();
}
