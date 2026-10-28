import {
  ALERT_CODES,
  ALERT_SEVERITIES,
  type Alert,
  type AlertCode,
  type AlertSeverity,
  type AlertType,
} from './types';

/** Params the backend sends with each alert code (contract 4.8). */
export const ALERT_PARAMS: Readonly<Record<AlertCode, readonly string[]>> = Object.freeze({
  OUT_OF_STOCK: ['name', 'minStock'],
  BELOW_MIN_STOCK: ['name', 'availableQty', 'minStock'],
  EXPIRES_IN_DAYS: ['name', 'days', 'expiryDate'],
  COVERAGE_EXCEEDS_EXPIRY: ['name', 'coverageDays', 'daysToExpiry'],
  NO_RECENT_OUTFLOW: ['name', 'windowDays'],
  PENDING_DEMAND_EXCEEDS_STOCK: ['name', 'demand', 'available'],
  ORDER_DUE_IN_DAYS: ['orderCode', 'days'],
  ORDER_OVERDUE: ['orderCode', 'daysOverdue'],
});

export interface AlertView {
  /** Key in the Alerts.codes namespace. */
  key: AlertCode | 'UNKNOWN';
  values: Record<string, number | string>;
  /** Locale-less link to the product or order. */
  href: string;
  /** Product name or order code, for the card title. */
  subject: string;
}

export function isKnownAlertCode(code: string): code is AlertCode {
  return (ALERT_CODES as readonly string[]).includes(code);
}

/** Turns a server alert into an i18n key, its values and a link. Never shows server text. */
export function alertView(alert: Alert): AlertView {
  const href =
    alert.entity === 'Order' ? `/app/orders/${alert.entityId}` : `/app/products/${alert.entityId}`;
  const subject = String(alert.params.name ?? alert.params.orderCode ?? '');
  if (!isKnownAlertCode(alert.code)) return { key: 'UNKNOWN', values: {}, href, subject };
  const values: Record<string, number | string> = {};
  for (const name of ALERT_PARAMS[alert.code]) values[name] = alert.params[name] ?? 0;
  return { key: alert.code, values, href, subject };
}

/** Alerts grouped by severity, most severe first, keeping the server order inside a group. */
export function groupBySeverity(
  alerts: readonly Alert[],
): { severity: AlertSeverity; alerts: Alert[] }[] {
  return ALERT_SEVERITIES.map((severity) => ({
    severity,
    alerts: alerts.filter((alert) => alert.severity === severity),
  })).filter((group) => group.alerts.length > 0);
}

export function filterByType(alerts: readonly Alert[], types: readonly AlertType[]): Alert[] {
  return types.length === 0 ? [...alerts] : alerts.filter((alert) => types.includes(alert.type));
}

export function countBySeverity(alerts: readonly Alert[], severity: AlertSeverity): number {
  return alerts.filter((alert) => alert.severity === severity).length;
}

/** Counts per type, for the filter chips. */
export function countByType(alerts: readonly Alert[]): Partial<Record<AlertType, number>> {
  const counts: Partial<Record<AlertType, number>> = {};
  for (const alert of alerts) counts[alert.type] = (counts[alert.type] ?? 0) + 1;
  return counts;
}
