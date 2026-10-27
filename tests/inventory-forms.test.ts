import { describe, expect, it } from 'vitest';
import {
  entryFormSchema,
  exitFormSchema,
  parseQuantity,
  productFormSchema,
  validateForm,
} from '@/features/inventory/form-validation';
import { mapMutationError } from '@/features/inventory/mutation-errors';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import en from '../messages/en.json';
import es from '../messages/es.json';

const exitValues = { quantity: '5', type: 'EXIT_WASTE', lotId: '', reason: 'Empaque roto' };

describe('parseQuantity', () => {
  it('accepts a comma or a dot as decimal separator', () => {
    expect(parseQuantity('12,5')).toBe(12.5);
    expect(parseQuantity(' 12.5 ')).toBe(12.5);
    expect(parseQuantity('7')).toBe(7);
  });

  it.each(['', 'abc', '-3', '1e3', '1.2.3', '1,'])('rejects %j', (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe('exit form', () => {
  it('turns a valid form into the API body, with no lot meaning FEFO', () => {
    expect(validateForm(exitFormSchema, { ...exitValues, quantity: '2,25' })).toEqual({
      ok: true,
      data: { quantity: 2.25, type: 'EXIT_WASTE', lotId: undefined, reason: 'Empaque roto' },
    });
  });

  it.each([
    ['', 'required'],
    ['0', 'mustBePositive'],
    ['1.2345', 'tooManyDecimals'],
    ['muchos', 'notANumber'],
    ['1000000000', 'tooLarge'],
  ])('quantity %j is %s', (quantity, key) => {
    expect(validateForm(exitFormSchema, { ...exitValues, quantity })).toEqual({
      ok: false,
      errors: { quantity: key },
    });
  });

  it('requires a reason and a manual exit type', () => {
    expect(
      validateForm(exitFormSchema, { ...exitValues, reason: '  ', type: 'EXIT_DISPATCH' }),
    ).toEqual({ ok: false, errors: { reason: 'required', type: 'invalidOption' } });
  });
});

describe('entry and product forms', () => {
  const entry = entryFormSchema('2026-10-26');
  const values = { quantity: '10', expiryDate: '2026-10-26', lotCode: '', note: '' };

  it('accepts an expiry date of today and drops blank optional fields', () => {
    expect(validateForm(entry, values)).toEqual({
      ok: true,
      data: { quantity: 10, expiryDate: '2026-10-26', lotCode: undefined, note: undefined },
    });
  });

  it('rejects a past or impossible expiry date', () => {
    expect(validateForm(entry, { ...values, expiryDate: '2026-10-25' })).toMatchObject({
      errors: { expiryDate: 'pastDate' },
    });
    expect(validateForm(entry, { ...values, expiryDate: '2026-02-30' })).toMatchObject({
      errors: { expiryDate: 'invalidDate' },
    });
  });

  it('allows a minimum stock of 0 but not a negative one', () => {
    const product = { name: 'Arroz', category: 'GRAINS_LEGUMES', unit: 'KG', status: 'ACTIVE' };
    expect(validateForm(productFormSchema, { ...product, minStock: '0' }).ok).toBe(true);
    expect(validateForm(productFormSchema, { ...product, minStock: '-1' })).toMatchObject({
      errors: { minStock: 'notANumber' },
    });
  });
});

describe('mapMutationError', () => {
  it('shows the available quantity from the 409 details', () => {
    const error = new ApiError(409, 'INSUFFICIENT_STOCK', 'Not enough stock', {
      productId: 'p1',
      requested: 99999,
      available: 66.5,
    });
    expect(mapMutationError(error)).toEqual({
      kind: 'insufficientStock',
      available: 66.5,
      requested: 99999,
    });
  });

  it('copes with a 409 after a lost race that has no available figure', () => {
    const error = new ApiError(409, 'INSUFFICIENT_STOCK', 'x', { lotId: 'l1' });
    expect(mapMutationError(error)).toEqual({
      kind: 'insufficientStock',
      available: null,
      requested: null,
    });
  });

  it.each([
    [new ApiError(409, 'DUPLICATE', 'x'), 'duplicateName'],
    [new ApiError(404, 'NOT_FOUND', 'x'), 'notFound'],
    [new ApiError(400, 'VALIDATION_ERROR', 'x'), 'invalid'],
    [new ApiError(403, 'FORBIDDEN', 'x'), 'forbidden'],
    [new ApiError(401, 'UNAUTHENTICATED', 'x'), 'sessionExpired'],
    [new ApiError(0, NETWORK_ERROR_CODE, 'x'), 'network'],
    [new ApiError(500, 'INTERNAL_ERROR', 'x'), 'unexpected'],
    [new Error('boom'), 'unexpected'],
  ])('maps %o to %s', (error, kind) => {
    expect(mapMutationError(error).kind).toBe(kind);
  });

  it.each(Object.entries({ es, en }))('%s has a message for every error kind', (_l, messages) => {
    const errors = messages.Forms.mutationErrors;
    for (const kind of [
      'insufficientStock',
      'insufficientStockUnknown',
      'duplicateName',
      'notFound',
      'invalid',
      'forbidden',
      'sessionExpired',
      'network',
      'unexpected',
    ]) {
      expect(errors[kind as keyof typeof errors], kind).toBeTruthy();
    }
  });
});
