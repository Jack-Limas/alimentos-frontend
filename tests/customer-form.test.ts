import { describe, expect, it } from 'vitest';
import { toCustomerPatch, validateCustomerForm } from '@/features/customers/customer-form';

const valid = {
  name: 'Restaurante El Fogón',
  type: 'RESTAURANT',
  address: 'Calle 85 # 12-30, Bogotá',
  phone: '+57 601 345 6789',
  email: 'compras@example.com',
};

describe('validateCustomerForm', () => {
  it('turns a valid form into the API body', () => {
    expect(validateCustomerForm(valid)).toEqual({ ok: true, data: valid });
  });

  it('leaves out blank phone and email', () => {
    expect(validateCustomerForm({ ...valid, phone: ' ', email: '' })).toEqual({
      ok: true,
      data: { name: valid.name, type: 'RESTAURANT', address: valid.address },
    });
  });

  it('flags missing fields and malformed phone and email', () => {
    expect(
      validateCustomerForm({
        name: '',
        type: 'BAR',
        address: '',
        phone: 'llamar',
        email: 'no-arroba',
      }),
    ).toEqual({
      ok: false,
      errors: {
        name: 'required',
        type: 'invalidOption',
        address: 'required',
        phone: 'invalidPhone',
        email: 'invalidEmail',
      },
    });
  });

  it('builds a patch that clears removed contact data with null', () => {
    expect(toCustomerPatch({ name: 'X', type: 'SCHOOL', address: 'Cra 1' })).toEqual({
      name: 'X',
      type: 'SCHOOL',
      address: 'Cra 1',
      phone: null,
      email: null,
    });
  });
});
