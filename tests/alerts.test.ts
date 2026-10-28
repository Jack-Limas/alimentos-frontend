import { describe, expect, it } from 'vitest';
import {
  ALERT_PARAMS,
  alertView,
  countBySeverity,
  countByType,
  filterByType,
  groupBySeverity,
} from '@/features/alerts/alert-messages';
import { ALERT_CODES, ALERT_TYPES, type Alert } from '@/features/alerts/types';
import en from '../messages/en.json';
import es from '../messages/es.json';

/** Top-level ICU argument names of a message. */
function placeholders(message: string): string[] {
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < message.length; i += 1) {
    if (message[i] === '{') {
      if (depth === 0) {
        const match = /^\{\s*([A-Za-z]+)/.exec(message.slice(i));
        if (match?.[1]) names.add(match[1]);
      }
      depth += 1;
    } else if (message[i] === '}') depth -= 1;
  }
  return [...names].sort();
}

const product = (
  code: string,
  severity: Alert['severity'],
  params: Alert['params'],
  type: Alert['type'] = 'LOW_STOCK',
): Alert => ({
  type,
  severity,
  entity: 'Product',
  entityId: 'p1',
  code,
  params,
});

describe('alert messages', () => {
  it.each(ALERT_CODES)(
    '%s has the same placeholders in es and en, all sent by the server',
    (code) => {
      expect(placeholders(es.Alerts.codes[code])).toEqual(placeholders(en.Alerts.codes[code]));
      for (const name of placeholders(es.Alerts.codes[code]))
        expect(ALERT_PARAMS[code]).toContain(name);
    },
  );

  it.each(Object.entries({ es, en }))(
    '%s labels every type, severity and the unknown code',
    (_l, m) => {
      for (const type of ALERT_TYPES) expect(m.Alerts.types[type]).toBeTruthy();
      for (const severity of ['CRITICAL', 'WARNING', 'INFO'] as const)
        expect(m.Alerts.severity[severity]).toBeTruthy();
      expect(m.Alerts.codes.UNKNOWN).toBeTruthy();
    },
  );

  it('maps a product alert to its key, values and product link', () => {
    expect(
      alertView(
        product('BELOW_MIN_STOCK', 'WARNING', {
          name: 'Lenteja',
          availableQty: 37.1,
          minStock: 50,
        }),
      ),
    ).toEqual({
      key: 'BELOW_MIN_STOCK',
      values: { name: 'Lenteja', availableQty: 37.1, minStock: 50 },
      href: '/app/products/p1',
      subject: 'Lenteja',
    });
  });

  it('maps an order alert to the order page', () => {
    const view = alertView({
      type: 'ORDER_DUE_SOON',
      severity: 'CRITICAL',
      entity: 'Order',
      entityId: 'o1',
      code: 'ORDER_OVERDUE',
      params: { orderCode: 'PED-000001', daysOverdue: 2 },
    });
    expect(view).toMatchObject({
      key: 'ORDER_OVERDUE',
      href: '/app/orders/o1',
      subject: 'PED-000001',
    });
  });

  it('never shows text for an unknown code', () => {
    expect(alertView(product('NEW_CODE', 'INFO', { name: 'X', anything: 1 }))).toMatchObject({
      key: 'UNKNOWN',
      values: {},
    });
  });
});

describe('alert grouping', () => {
  const alerts = [
    product('BELOW_MIN_STOCK', 'WARNING', {}),
    product('OUT_OF_STOCK', 'CRITICAL', {}),
    product('EXPIRES_IN_DAYS', 'WARNING', {}, 'EXPIRING_SOON'),
    product('OUT_OF_STOCK', 'CRITICAL', {}),
  ];

  it('groups by severity, most severe first, without empty groups', () => {
    expect(groupBySeverity(alerts).map((g) => [g.severity, g.alerts.length])).toEqual([
      ['CRITICAL', 2],
      ['WARNING', 2],
    ]);
  });

  it('filters and counts by type and severity', () => {
    expect(filterByType(alerts, ['EXPIRING_SOON'])).toHaveLength(1);
    expect(filterByType(alerts, [])).toHaveLength(4);
    expect(countBySeverity(alerts, 'CRITICAL')).toBe(2);
    expect(countByType(alerts)).toEqual({ LOW_STOCK: 3, EXPIRING_SOON: 1 });
  });
});
