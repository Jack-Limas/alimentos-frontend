import { z } from 'zod';
import {
  futureDate,
  option,
  optionalText,
  quantity,
  type FieldErrorKey,
} from '@/features/inventory/form-validation';
import type { CalendarDate } from '@/lib/dates';
import { ORDER_PRIORITIES, type OrderInput } from './types';

export const MAX_ORDER_ITEMS = 50;

/** Keys of the NewOrder.errors namespace (the rest live in Forms.errors). */
export type OrderErrorKey =
  'customerRequired' | 'itemsRequired' | 'productRequired' | 'duplicateProduct' | 'tooManyItems';

export type OrderFormErrorKey = FieldErrorKey | OrderErrorKey;

export const ORDER_ERROR_KEYS: readonly OrderErrorKey[] = [
  'customerRequired',
  'itemsRequired',
  'productRequired',
  'duplicateProduct',
  'tooManyItems',
];

export function isOrderErrorKey(key: OrderFormErrorKey): key is OrderErrorKey {
  return (ORDER_ERROR_KEYS as readonly string[]).includes(key);
}

export interface OrderFormValues {
  customerId: string;
  priority: string;
  dueDate: string;
  notes: string;
  items: { productId: string; quantity: string }[];
}

export interface OrderFormErrors {
  customerId?: OrderFormErrorKey;
  priority?: OrderFormErrorKey;
  dueDate?: OrderFormErrorKey;
  notes?: OrderFormErrorKey;
  /** Errors about the list as a whole (empty, too long). */
  items?: OrderFormErrorKey;
  /** Errors per row, by index. */
  rows: Record<number, { productId?: OrderFormErrorKey; quantity?: OrderFormErrorKey }>;
}

function orderFormSchema(today: CalendarDate) {
  return z.object({
    customerId: z.string().min(1, { error: 'customerRequired' }),
    priority: option(ORDER_PRIORITIES),
    dueDate: futureDate(today),
    notes: optionalText(500),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, { error: 'productRequired' }),
          quantity: quantity(false),
        }),
      )
      .min(1, { error: 'itemsRequired' })
      .max(MAX_ORDER_ITEMS, { error: 'tooManyItems' }),
  });
}

export type OrderFormResult =
  { ok: true; data: OrderInput } | { ok: false; errors: OrderFormErrors };

/** Rows that repeat a product chosen in an earlier row. */
function duplicateRows(items: OrderFormValues['items']): number[] {
  const seen = new Set<string>();
  const rows: number[] = [];
  items.forEach((item, index) => {
    if (item.productId === '') return;
    if (seen.has(item.productId)) rows.push(index);
    seen.add(item.productId);
  });
  return rows;
}

/**
 * Validates the new order form with the same rules as POST /orders: an active
 * customer, a due date from today (Bogota), 1 to 50 distinct products and
 * quantities above 0 with at most 3 decimals.
 */
export function validateOrderForm(values: OrderFormValues, today: CalendarDate): OrderFormResult {
  const result = orderFormSchema(today).safeParse(values);
  // Checked apart from Zod: array refinements do not run while a row is invalid.
  const duplicates = duplicateRows(values.items);
  if (result.success && duplicates.length === 0) {
    const { notes, ...rest } = result.data;
    return {
      ok: true,
      data: { ...rest, priority: rest.priority, ...(notes ? { notes } : {}) },
    };
  }
  const errors: OrderFormErrors = { rows: {} };
  for (const index of duplicates) errors.rows[index] = { productId: 'duplicateProduct' };
  for (const issue of result.success ? [] : result.error.issues) {
    const key = issue.message as OrderFormErrorKey;
    const [field, index, rowField] = issue.path;
    if (
      field === 'items' &&
      typeof index === 'number' &&
      (rowField === 'productId' || rowField === 'quantity')
    ) {
      const row = (errors.rows[index] ??= {});
      row[rowField] ??= key;
    } else if (
      field === 'customerId' ||
      field === 'priority' ||
      field === 'dueDate' ||
      field === 'notes' ||
      field === 'items'
    ) {
      errors[field] ??= key;
    }
  }
  return { ok: false, errors };
}
