import { z } from 'zod';
import { CATEGORIES, PRODUCT_STATUSES } from '@/features/products/types';
import { isCalendarDate, type CalendarDate } from '@/lib/dates';
import { MANUAL_EXIT_TYPES, UNITS } from './types';

/** Same limits as the backend schemas (Decimal(12,3)). */
export const MAX_QTY = 999_999_999.999;

/** i18n keys of the Forms.errors namespace. */
export type FieldErrorKey =
  | 'required'
  | 'notANumber'
  | 'mustBePositive'
  | 'mustNotBeNegative'
  | 'tooManyDecimals'
  | 'tooLarge'
  | 'invalidDate'
  | 'pastDate'
  | 'tooLong'
  | 'invalidOption';

/**
 * Parses what a person types as a quantity: "12,5" (Spanish keyboards) or
 * "12.5". Returns null when it is not a plain decimal number.
 */
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function decimalsOf(text: string): number {
  return text.trim().replace(',', '.').split('.')[1]?.length ?? 0;
}

function quantity(allowZero: boolean) {
  return z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .refine((text) => parseQuantity(text) !== null, { error: 'notANumber', abort: true })
    .refine((text) => decimalsOf(text) <= 3, { error: 'tooManyDecimals', abort: true })
    .transform((text) => parseQuantity(text) ?? 0)
    .refine((value) => (allowZero ? value >= 0 : value > 0), {
      error: allowZero ? 'mustNotBeNegative' : 'mustBePositive',
    })
    .refine((value) => value <= MAX_QTY, { error: 'tooLarge' });
}

const requiredText = (max: number) =>
  z.string().trim().min(1, { error: 'required' }).max(max, { error: 'tooLong' });

/** Optional text: blank becomes undefined so it is not sent. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: 'tooLong' })
    .transform((text) => (text === '' ? undefined : text));

const option = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { error: 'invalidOption' });

export const productFormSchema = z.object({
  name: requiredText(120),
  category: option(CATEGORIES),
  unit: option(UNITS),
  minStock: quantity(true),
  status: option(PRODUCT_STATUSES),
});

/** Entry: the expiry date cannot be before today in Bogota (the backend checks it too). */
export function entryFormSchema(today: CalendarDate) {
  return z.object({
    quantity: quantity(false),
    expiryDate: z
      .string()
      .min(1, { error: 'required' })
      .refine(isCalendarDate, { error: 'invalidDate', abort: true })
      .refine((date) => date >= today, { error: 'pastDate' }),
    lotCode: optionalText(64),
    note: optionalText(500),
  });
}

export const exitFormSchema = z.object({
  quantity: quantity(false),
  type: option(MANUAL_EXIT_TYPES),
  /** Empty means "let the server pick lots in FEFO order". */
  lotId: z.string().transform((id) => (id === '' ? undefined : id)),
  reason: requiredText(500),
});

export type FieldErrors<K extends string> = Partial<Record<K, FieldErrorKey>>;

export type FormResult<T, K extends string> =
  { ok: true; data: T } | { ok: false; errors: FieldErrors<K> };

/** Raw form state: every input, select and radio gives a string. */
export type FormValues<S extends z.ZodType> = { [K in keyof z.input<S>]: string };

/** Runs a form schema and returns the first error key of every field. */
export function validateForm<S extends z.ZodType<unknown, Record<string, string>>>(
  schema: S,
  values: FormValues<S>,
): FormResult<z.output<S>, Extract<keyof z.input<S>, string>> {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, FieldErrorKey> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && errors[field] === undefined) {
      errors[field] = issue.message as FieldErrorKey;
    }
  }
  return { ok: false, errors: errors as FieldErrors<Extract<keyof z.input<S>, string>> };
}
