// Alert from GET /alerts (contract 4.8), typed from a real response.

export const ALERT_TYPES = [
  'LOW_STOCK',
  'SHORTAGE_RISK',
  'EXPIRING_SOON',
  'WASTE_RISK',
  'ORDER_DUE_SOON',
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

/** Most severe first. */
export const ALERT_SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_CODES = [
  'OUT_OF_STOCK',
  'BELOW_MIN_STOCK',
  'EXPIRES_IN_DAYS',
  'COVERAGE_EXCEEDS_EXPIRY',
  'NO_RECENT_OUTFLOW',
  'PENDING_DEMAND_EXCEEDS_STOCK',
  'ORDER_DUE_IN_DAYS',
  'ORDER_OVERDUE',
] as const;
export type AlertCode = (typeof ALERT_CODES)[number];

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  entity: 'Product' | 'Order';
  entityId: string;
  code: string;
  /** Product alerts carry `name`, order alerts `orderCode`. */
  params: Record<string, number | string>;
}
