import { routing } from '@/i18n/routing';

export const VITAL_NAMES = ['INP', 'LCP', 'CLS', 'TTFB', 'FCP'] as const;
export type VitalName = (typeof VITAL_NAMES)[number];
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Google's thresholds (web.dev/vitals): up to `good` is good, above `poor` is
 * poor, in between needs improvement. CLS is unitless; the rest are ms.
 */
export const VITAL_THRESHOLDS: Readonly<Record<VitalName, { good: number; poor: number }>> = {
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

export function rateVital(name: VitalName, value: number): VitalRating {
  const { good, poor } = VITAL_THRESHOLDS[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/** "0.08" for CLS, "1,234 ms" style for the rest (the caller formats the number). */
export function vitalUnit(name: VitalName): 'ms' | null {
  return name === 'CLS' ? null : 'ms';
}

/**
 * Every page of the app as its route pattern, without the locale. Static
 * segments win over dynamic ones (`/app/orders/new` before `/app/orders/[id]`).
 * A test keeps this list in sync with `src/app/[locale]`.
 */
export const ROUTE_PATTERNS = [
  '/',
  '/login',
  '/offline',
  '/impact',
  '/system-check',
  '/app',
  '/app/alerts',
  '/app/customers',
  '/app/distribution',
  '/app/distribution/[id]',
  '/app/lab/performance',
  '/app/metrics',
  '/app/missions',
  '/app/movements',
  '/app/orders',
  '/app/orders/new',
  '/app/orders/[id]',
  '/app/products',
  '/app/products/[id]',
  '/app/reports',
] as const;

/** What unknown paths (the 404 page) are reported as: never the typed URL. */
export const UNKNOWN_PAGE = '/[...rest]';

function matches(pattern: string, segments: string[]): boolean {
  const parts = pattern.split('/').filter(Boolean);
  return (
    parts.length === segments.length &&
    parts.every((part, index) => part === '[id]' || part === segments[index])
  );
}

/**
 * The page a web vital is reported for: the route pattern of `pathname`
 * (`/es/app/orders/4f1c…` → `/app/orders/[id]`), with no locale, query, hash
 * or IDs. The backend stores it as is, so it must never carry personal data.
 */
export function normalizePage(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  if ((routing.locales as readonly string[]).includes(segments[0] ?? '')) segments.shift();
  const statics = ROUTE_PATTERNS.filter((pattern) => !pattern.includes('['));
  const found =
    statics.find((pattern) => matches(pattern, segments)) ??
    ROUTE_PATTERNS.find((pattern) => matches(pattern, segments));
  return found ?? UNKNOWN_PAGE;
}
