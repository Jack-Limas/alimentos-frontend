import { z } from 'zod';
import { option, requiredText, type FieldErrorKey } from '@/features/inventory/form-validation';
import { CUSTOMER_TYPES, type CustomerInput, type CustomerPatch } from './types';

/** Same rule as the backend: Colombian landlines and mobiles, optional +57 and separators. */
const PHONE = /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CustomerFormErrorKey = FieldErrorKey | 'invalidPhone' | 'invalidEmail';

export interface CustomerFormValues {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
}

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, CustomerFormErrorKey>>;

const schema = z.object({
  name: requiredText(120),
  type: option(CUSTOMER_TYPES),
  address: requiredText(200),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || PHONE.test(value), { error: 'invalidPhone' }),
  email: z
    .string()
    .trim()
    .max(254, { error: 'tooLong' })
    .refine((value) => value === '' || EMAIL.test(value), { error: 'invalidEmail' }),
});

export type CustomerFormResult =
  { ok: true; data: CustomerInput } | { ok: false; errors: CustomerFormErrors };

/** Validates the customer form; blank phone or email are left out. */
export function validateCustomerForm(values: CustomerFormValues): CustomerFormResult {
  const result = schema.safeParse(values);
  if (!result.success) {
    const errors: CustomerFormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof CustomerFormValues;
      errors[field] ??= issue.message as CustomerFormErrorKey;
    }
    return { ok: false, errors };
  }
  const { phone, email, ...rest } = result.data;
  return {
    ok: true,
    data: { ...rest, ...(phone ? { phone } : {}), ...(email ? { email } : {}) },
  };
}

/** PATCH body for an edit: a cleared phone or email becomes null so the server removes it. */
export function toCustomerPatch(data: CustomerInput): CustomerPatch {
  return {
    name: data.name,
    type: data.type,
    address: data.address,
    phone: data.phone ?? null,
    email: data.email ?? null,
  };
}
