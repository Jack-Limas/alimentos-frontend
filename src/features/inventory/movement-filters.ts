import { businessDayBounds, isCalendarDate, type CalendarDate } from '@/lib/dates';
import { MOVEMENT_TYPES, type MovementType } from './types';

export const MOVEMENTS_PAGE_SIZE = 20;

/** Movement list filters as they live in the URL (`/app/movements?...`). */
export interface MovementFilters {
  type?: MovementType;
  /** Business days in Bogota, both inclusive. */
  from?: CalendarDate;
  to?: CalendarDate;
  page: number;
}

export function parseMovementFilters(params: URLSearchParams): MovementFilters {
  const filters: MovementFilters = { page: 1 };
  const page = params.get('page');
  if (page !== null && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Number(page);
  const type = params.get('type');
  if (type !== null && (MOVEMENT_TYPES as readonly string[]).includes(type)) {
    filters.type = type as MovementType;
  }
  const from = params.get('from');
  if (from !== null && isCalendarDate(from)) filters.from = from;
  const to = params.get('to');
  if (to !== null && isCalendarDate(to)) filters.to = to;
  // A reversed range would be a 400: keep only the start.
  if (filters.from && filters.to && filters.from > filters.to) delete filters.to;
  return filters;
}

export function serializeMovementFilters(filters: MovementFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

/** The API takes instants: `from` is the start of that day in Bogota, `to` its end. */
export function toMovementsApiQuery(
  filters: MovementFilters,
  pageSize = MOVEMENTS_PAGE_SIZE,
): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', businessDayBounds(filters.from).start);
  if (filters.to) params.set('to', businessDayBounds(filters.to).end);
  params.set('page', String(filters.page));
  params.set('pageSize', String(pageSize));
  return params.toString();
}
