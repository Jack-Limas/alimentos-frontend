import { normalizePage, rateVital, type VitalName, type VitalRating } from './vitals';

/** POST /metrics/web-vitals body (contract 4.10). */
export interface VitalSample {
  name: VitalName;
  value: number;
  rating: VitalRating;
  page: string;
}

/** The backend accepts 0–60,000. */
const MAX_VALUE = 60_000;
/** Metrics measured once per page load: they belong to the page that was loaded. */
const LOAD_METRICS: ReadonlySet<VitalName> = new Set(['TTFB', 'FCP', 'LCP']);

/**
 * Turns a web-vitals metric into the sample the API stores. CLS keeps 4
 * decimals; the others are whole milliseconds. The rating is recomputed with
 * the same thresholds the metrics screen shows.
 */
export function toSample(metric: { name: VitalName; value: number }, page: string): VitalSample {
  const clamped = Math.min(MAX_VALUE, Math.max(0, metric.value));
  const value = metric.name === 'CLS' ? Math.round(clamped * 10_000) / 10_000 : Math.round(clamped);
  return { name: metric.name, value, rating: rateVital(metric.name, value), page };
}

export interface VitalsReporterDeps {
  /** Sends one sample (fetch with keepalive and the session). */
  send: (sample: VitalSample) => Promise<unknown>;
  /** Only users with a session report: the endpoint needs a token. */
  hasSession: () => boolean;
  /** The current pathname (with locale); read when a metric is reported. */
  currentPath: () => string;
  /** The pathname of the hard load, for TTFB, FCP and LCP. */
  loadedPath: string;
}

/**
 * The callback given to onINP/onLCP/onCLS/onTTFB/onFCP. INP and CLS are
 * reported when the page is hidden, so they go to the page shown at that
 * moment; the load metrics go to the page that was loaded. Failures are
 * ignored: metrics must never bother the user.
 */
export function createVitalsReporter({
  send,
  hasSession,
  currentPath,
  loadedPath,
}: VitalsReporterDeps) {
  return (metric: { name: VitalName; value: number }): void => {
    if (!hasSession()) return;
    const path = LOAD_METRICS.has(metric.name) ? loadedPath : currentPath();
    send(toSample(metric, normalizePage(path))).catch(() => undefined);
  };
}
