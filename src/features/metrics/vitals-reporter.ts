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

/** Samples kept while the session is still being restored (TTFB and FCP come first). */
const MAX_PENDING = 20;

export type ReporterSession = 'loading' | 'authenticated' | 'anonymous';

export interface VitalsReporterDeps {
  /** Sends one sample (fetch with keepalive and the session). */
  send: (sample: VitalSample) => Promise<unknown>;
  /** Only users with a session report: the endpoint needs a token. */
  session: () => ReporterSession;
  /** The current pathname (with locale); read when a metric is reported. */
  currentPath: () => string;
  /** The pathname of the hard load, for TTFB, FCP and LCP. */
  loadedPath: string;
}

/**
 * `report` is the callback given to onINP/onLCP/onCLS/onTTFB/onFCP. INP and
 * CLS are reported when the page is hidden, so they go to the page shown at
 * that moment; the load metrics go to the page that was loaded. While the
 * session is still being restored the samples wait; `sessionChanged` sends
 * them once it is authenticated and drops them if it ends anonymous. Failures
 * are ignored: metrics must never bother the user.
 */
export function createVitalsReporter({
  send,
  session,
  currentPath,
  loadedPath,
}: VitalsReporterDeps) {
  let pending: VitalSample[] = [];
  const deliver = (sample: VitalSample) => {
    send(sample).catch(() => undefined);
  };

  return {
    report(metric: { name: VitalName; value: number }): void {
      const state = session();
      if (state === 'anonymous') return;
      const path = LOAD_METRICS.has(metric.name) ? loadedPath : currentPath();
      const sample = toSample(metric, normalizePage(path));
      if (state === 'loading') {
        if (pending.length < MAX_PENDING) pending.push(sample);
        return;
      }
      deliver(sample);
    },

    sessionChanged(): void {
      const state = session();
      if (state === 'loading') return;
      const waiting = pending;
      pending = [];
      if (state === 'authenticated') waiting.forEach(deliver);
    },
  };
}
