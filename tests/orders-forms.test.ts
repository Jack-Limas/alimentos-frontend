import { describe, expect, it } from 'vitest';
import {
  parseOrderFilters,
  serializeOrderFilters,
  toggleStatus,
  toOrdersApiQuery,
  withOrderFilter,
} from '@/features/orders/filters';
import {
  ORDER_ERROR_KEYS,
  validateOrderForm,
  type OrderFormValues,
} from '@/features/orders/order-form';
import en from '../messages/en.json';
import es from '../messages/es.json';

const CUSTOMER = '52b55de7-ea12-4b16-b515-2c5b8bd5ccb9';
const parse = (query: string) => parseOrderFilters(new URLSearchParams(query));

describe('order filters and the URL', () => {
  it('round-trips several statuses in canonical order and the other filters', () => {
    const filters = parse(
      `status=SHIPPED,PENDING&priority=URGENT&customerId=${CUSTOMER}&dueBefore=2026-10-30&page=2`,
    );
    expect(filters).toEqual({
      statuses: ['PENDING', 'SHIPPED'],
      priority: 'URGENT',
      customerId: CUSTOMER,
      dueBefore: '2026-10-30',
      page: 2,
    });
    expect(serializeOrderFilters(filters)).toBe(
      `status=PENDING%2CSHIPPED&priority=URGENT&customerId=${CUSTOMER}&dueBefore=2026-10-30&page=2`,
    );
    expect(parse(serializeOrderFilters(filters))).toEqual(filters);
  });

  it('accepts repeated status params and drops unknown values', () => {
    expect(parse('status=PENDING&status=LOST&status=DELIVERED').statuses).toEqual([
      'PENDING',
      'DELIVERED',
    ]);
    expect(parse('priority=ASAP&customerId=abc&dueBefore=2026-02-30&page=0')).toEqual({
      statuses: [],
      page: 1,
    });
  });

  it('toggles statuses and goes back to page 1', () => {
    const start = { statuses: ['PENDING' as const], page: 3 };
    expect(toggleStatus(start, 'IN_PREPARATION')).toEqual({
      statuses: ['PENDING', 'IN_PREPARATION'],
      page: 1,
    });
    expect(toggleStatus(start, 'PENDING')).toEqual({ statuses: [], page: 1 });
    expect(
      withOrderFilter({ statuses: [], priority: 'LOW', page: 2 }, { priority: undefined }),
    ).toEqual({
      statuses: [],
      page: 1,
    });
  });

  it('builds the API query with page and page size', () => {
    expect(toOrdersApiQuery({ statuses: ['PENDING'], page: 2 }, 12)).toBe(
      'status=PENDING&page=2&pageSize=12',
    );
  });
});

describe('validateOrderForm', () => {
  const TODAY = '2026-10-28';
  const valid: OrderFormValues = {
    customerId: CUSTOMER,
    priority: 'HIGH',
    dueDate: TODAY,
    notes: '',
    items: [
      { productId: 'p1', quantity: '12,5' },
      { productId: 'p2', quantity: '3' },
    ],
  };

  it('turns a valid form into the API body', () => {
    expect(validateOrderForm(valid, TODAY)).toEqual({
      ok: true,
      data: {
        customerId: CUSTOMER,
        priority: 'HIGH',
        dueDate: TODAY,
        items: [
          { productId: 'p1', quantity: 12.5 },
          { productId: 'p2', quantity: 3 },
        ],
      },
    });
  });

  it('requires a customer, a future date and at least one item', () => {
    expect(
      validateOrderForm({ ...valid, customerId: '', dueDate: '2026-10-27', items: [] }, TODAY),
    ).toEqual({
      ok: false,
      errors: {
        customerId: 'customerRequired',
        dueDate: 'pastDate',
        items: 'itemsRequired',
        rows: {},
      },
    });
  });

  it('flags row errors: missing product, bad quantity, 4 decimals and duplicates', () => {
    const result = validateOrderForm(
      {
        ...valid,
        items: [
          { productId: '', quantity: '1' },
          { productId: 'p1', quantity: '0' },
          { productId: 'p2', quantity: '1.2345' },
          { productId: 'p1', quantity: '2' },
        ],
      },
      TODAY,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        rows: {
          0: { productId: 'productRequired' },
          1: { quantity: 'mustBePositive' },
          2: { quantity: 'tooManyDecimals' },
          3: { productId: 'duplicateProduct' },
        },
      },
    });
  });

  it('rejects more than 50 products', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      productId: `p${String(i)}`,
      quantity: '1',
    }));
    expect(validateOrderForm({ ...valid, items }, TODAY)).toMatchObject({
      errors: { items: 'tooManyItems' },
    });
  });

  it.each(Object.entries({ es, en }))(
    '%s has a message for every order form error',
    (_l, messages) => {
      for (const key of ORDER_ERROR_KEYS) expect(messages.NewOrder.errors[key]).toBeTruthy();
    },
  );
});
