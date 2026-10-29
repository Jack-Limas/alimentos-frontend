import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  normalizePage,
  rateVital,
  ROUTE_PATTERNS,
  UNKNOWN_PAGE,
  VITAL_THRESHOLDS,
} from '@/features/metrics/vitals';
import {
  createVitalsReporter,
  toSample,
  type ReporterSession,
  type VitalSample,
} from '@/features/metrics/vitals-reporter';

const ID = '4f1c2a9e-6b0d-4c1e-9a77-2f6d1b3c8e01';

describe('web vitals thresholds', () => {
  it("uses Google's thresholds", () => {
    expect(VITAL_THRESHOLDS).toEqual({
      INP: { good: 200, poor: 500 },
      LCP: { good: 2500, poor: 4000 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
      FCP: { good: 1800, poor: 3000 },
    });
  });

  it('rates the limits inclusively: good up to good, poor above poor', () => {
    expect(rateVital('INP', 200)).toBe('good');
    expect(rateVital('INP', 201)).toBe('needs-improvement');
    expect(rateVital('INP', 500)).toBe('needs-improvement');
    expect(rateVital('INP', 501)).toBe('poor');
    expect(rateVital('CLS', 0.1)).toBe('good');
    expect(rateVital('CLS', 0.11)).toBe('needs-improvement');
    expect(rateVital('CLS', 0.26)).toBe('poor');
    expect(rateVital('LCP', 4200)).toBe('poor');
    expect(rateVital('TTFB', 900)).toBe('needs-improvement');
    expect(rateVital('FCP', 1000)).toBe('good');
  });
});

describe('page normalization', () => {
  it('drops the locale, the query and the hash', () => {
    expect(normalizePage('/es/app/orders?status=PENDING#top')).toBe('/app/orders');
    expect(normalizePage('/en')).toBe('/');
    expect(normalizePage('/es/')).toBe('/');
    expect(normalizePage('/en/impact')).toBe('/impact');
  });

  it('replaces IDs with the route pattern', () => {
    expect(normalizePage(`/es/app/orders/${ID}`)).toBe('/app/orders/[id]');
    expect(normalizePage(`/en/app/products/${ID}`)).toBe('/app/products/[id]');
    expect(normalizePage(`/es/app/distribution/${ID}?tab=lines`)).toBe('/app/distribution/[id]');
  });

  it('prefers static segments over [id]', () => {
    expect(normalizePage('/es/app/orders/new')).toBe('/app/orders/new');
  });

  it('never reports an unknown typed URL', () => {
    expect(normalizePage('/es/maria.perez@example.com')).toBe(UNKNOWN_PAGE);
    expect(normalizePage(`/es/app/orders/${ID}/edit`)).toBe(UNKNOWN_PAGE);
  });

  it('knows every page of the app', () => {
    const root = join(process.cwd(), 'src/app/[locale]');
    const pages: string[] = [];
    const walk = (dir: string, route: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, `${route}/${entry}`);
        else if (entry === 'page.tsx') pages.push(route || '/');
      }
    };
    walk(root, '');
    const own = pages.filter((page) => !page.includes('[...rest]'));
    expect(own.length).toBeGreaterThan(10);
    for (const page of own) expect(ROUTE_PATTERNS).toContain(page);
  });
});

describe('web vitals reporter', () => {
  it('rounds and clamps the value and recomputes the rating', () => {
    expect(toSample({ name: 'LCP', value: 2499.6 }, '/app')).toEqual({
      name: 'LCP',
      value: 2500,
      rating: 'good',
      page: '/app',
    });
    expect(toSample({ name: 'CLS', value: 0.123456 }, '/').value).toBe(0.1235);
    expect(toSample({ name: 'INP', value: 90_000 }, '/').value).toBe(60_000);
  });

  it('reports only with a session', () => {
    const send = vi.fn<(sample: VitalSample) => Promise<void>>(() => Promise.resolve());
    const reporter = createVitalsReporter({
      send,
      session: () => 'anonymous',
      currentPath: () => '/es/app',
      loadedPath: '/es/app',
    });
    reporter.report({ name: 'FCP', value: 900 });
    reporter.sessionChanged();
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps early samples while the session loads and sends them once authenticated', () => {
    const send = vi.fn<(sample: VitalSample) => Promise<void>>(() => Promise.resolve());
    let state: ReporterSession = 'loading';
    const reporter = createVitalsReporter({
      send,
      session: () => state,
      currentPath: () => '/es/app',
      loadedPath: `/es/app/orders/${ID}`,
    });
    reporter.report({ name: 'TTFB', value: 120 });
    reporter.report({ name: 'FCP', value: 640 });
    reporter.sessionChanged();
    expect(send).not.toHaveBeenCalled();
    state = 'authenticated';
    reporter.sessionChanged();
    expect(send.mock.calls.map(([sample]) => [sample.name, sample.page])).toEqual([
      ['TTFB', '/app/orders/[id]'],
      ['FCP', '/app/orders/[id]'],
    ]);
    reporter.sessionChanged();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('drops the waiting samples when the session ends anonymous', () => {
    const send = vi.fn<(sample: VitalSample) => Promise<void>>(() => Promise.resolve());
    let state: ReporterSession = 'loading';
    const reporter = createVitalsReporter({
      send,
      session: () => state,
      currentPath: () => '/es',
      loadedPath: '/es',
    });
    reporter.report({ name: 'TTFB', value: 120 });
    state = 'anonymous';
    reporter.sessionChanged();
    state = 'authenticated';
    reporter.sessionChanged();
    expect(send).not.toHaveBeenCalled();
  });

  it('gives load metrics to the loaded page and INP/CLS to the current one', () => {
    const send = vi.fn<(sample: VitalSample) => Promise<void>>(() => Promise.resolve());
    const reporter = createVitalsReporter({
      send,
      session: () => 'authenticated',
      currentPath: () => `/es/app/orders/${ID}`,
      loadedPath: '/es/app',
    });
    reporter.report({ name: 'LCP', value: 1200 });
    reporter.report({ name: 'INP', value: 350 });
    expect(send.mock.calls.map(([sample]) => [sample.name, sample.page, sample.rating])).toEqual([
      ['LCP', '/app', 'good'],
      ['INP', '/app/orders/[id]', 'needs-improvement'],
    ]);
  });

  it('ignores send failures', async () => {
    const reporter = createVitalsReporter({
      send: () => Promise.reject(new Error('offline')),
      session: () => 'authenticated',
      currentPath: () => '/es/app',
      loadedPath: '/es/app',
    });
    expect(() => {
      reporter.report({ name: 'TTFB', value: 100 });
    }).not.toThrow();
    await Promise.resolve();
  });
});
