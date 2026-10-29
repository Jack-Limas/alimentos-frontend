import { ALERT_SEVERITIES, type Alert, type AlertSeverity } from './types';

/** What every tab receives: the alerts, counts per severity and when they were fetched. */
export interface AlertsSnapshot {
  alerts: Alert[];
  counts: Record<AlertSeverity, number>;
  /** Epoch milliseconds. */
  fetchedAt: number;
}

/** Tab → shared worker. The token is sent, never echoed back or logged. */
export type TabMessage =
  /** On connect: where the API is (the worker has no env) and the current token. */
  | { type: 'hello'; apiUrl: string; token: string | null }
  /** After login, after every refresh, and null after logout. */
  | { type: 'token'; token: string | null }
  /** The tab tried to refresh and the session is over. */
  | { type: 'refresh-failed' }
  /** Fetch now (e.g. an order changed status). */
  | { type: 'refetch' }
  | { type: 'pong' }
  /** The tab is going away (pagehide). */
  | { type: 'bye' };

/** Shared worker → tabs. */
export type HubMessage =
  | { type: 'snapshot'; snapshot: AlertsSnapshot }
  | { type: 'status'; ports: number; polling: boolean; error: 'network' | 'server' | null }
  /** The access token was rejected: this tab should refresh and send the new one. */
  | { type: 'need-refresh' }
  /** Logged out everywhere: drop the alerts. */
  | { type: 'cleared' }
  | { type: 'ping' };

export function countAlerts(alerts: readonly Alert[]): Record<AlertSeverity, number> {
  const counts = Object.fromEntries(ALERT_SEVERITIES.map((s) => [s, 0])) as Record<
    AlertSeverity,
    number
  >;
  for (const alert of alerts) counts[alert.severity] += 1;
  return counts;
}
