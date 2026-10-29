import { describe, expect, it } from 'vitest';
import {
  benchmarkErrorKey,
  benchmarkMaxFrom,
  sortByP95,
  type RouteMetrics,
} from '@/features/metrics/api';
import { loadTimingOf, measureMemory, memorySourceOf } from '@/features/metrics/browser-perf';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';

const route = (name: string, p95: number | null): RouteMetrics => ({
  route: name,
  count: 1,
  total: 1,
  errors5xx: 0,
  p50: p95,
  p75: p95,
  p95,
  p99: p95,
});

describe('API metrics', () => {
  it('sorts routes by p95, slowest first, empty ones last', () => {
    const sorted = sortByP95([route('a', 12), route('b', null), route('c', 80), route('d', 30)]);
    expect(sorted.map((r) => r.route)).toEqual(['c', 'd', 'a', 'b']);
  });
});

describe('benchmark errors', () => {
  const tooBig = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', {
    issues: [{ path: 'size', message: 'Too big: expected number to be <=25000' }],
  });

  it('reads the maximum size from the backend validation error', () => {
    expect(benchmarkMaxFrom(tooBig)).toBe(25_000);
    expect(
      benchmarkMaxFrom(
        new ApiError(400, 'VALIDATION_ERROR', 'Invalid', {
          issues: [{ path: 'other', message: '<=5' }],
        }),
      ),
    ).toBeNull();
    expect(benchmarkMaxFrom(new Error('x'))).toBeNull();
  });

  it('translates 409 BENCHMARK_RUNNING and the other failures', () => {
    expect(benchmarkErrorKey(new ApiError(409, 'BENCHMARK_RUNNING', 'busy'))).toBe('running');
    expect(benchmarkErrorKey(tooBig)).toBe('tooBig');
    expect(benchmarkErrorKey(new ApiError(403, 'FORBIDDEN', 'no'))).toBe('forbidden');
    expect(benchmarkErrorKey(new ApiError(0, NETWORK_ERROR_CODE, 'down'))).toBe('network');
    expect(benchmarkErrorKey(new Error('boom'))).toBe('unexpected');
  });
});

describe('browser load timing and memory', () => {
  it('measures TTFB, DOMContentLoaded and load from the navigation start', () => {
    expect(
      loadTimingOf({
        startTime: 0,
        responseStart: 120.4,
        domContentLoadedEventEnd: 640.6,
        loadEventEnd: 900,
      }),
    ).toEqual({ ttfb: 120, domContentLoaded: 641, load: 900 });
    expect(
      loadTimingOf({
        startTime: 0,
        responseStart: 50,
        domContentLoadedEventEnd: 300,
        loadEventEnd: 0,
      })?.load,
    ).toBeNull();
    expect(loadTimingOf(undefined)).toBeNull();
  });

  it('uses measureUserAgentSpecificMemory only when cross-origin isolated', async () => {
    const uasm = () => Promise.resolve({ bytes: 12_345_678 });
    const legacyMemory = { usedJSHeapSize: 9_000_000 };
    expect(
      memorySourceOf({ crossOriginIsolated: true, measureUserAgentSpecificMemory: uasm }),
    ).toBe('uasm');
    expect(
      memorySourceOf({
        crossOriginIsolated: false,
        measureUserAgentSpecificMemory: uasm,
        legacyMemory,
      }),
    ).toBe('legacy');
    expect(memorySourceOf({ crossOriginIsolated: false })).toBe('none');
    await expect(
      measureMemory({ crossOriginIsolated: true, measureUserAgentSpecificMemory: uasm }),
    ).resolves.toEqual({ source: 'uasm', bytes: 12_345_678 });
    await expect(measureMemory({ crossOriginIsolated: false, legacyMemory })).resolves.toEqual({
      source: 'legacy',
      bytes: 9_000_000,
    });
    await expect(measureMemory({ crossOriginIsolated: false })).resolves.toEqual({
      source: 'none',
      bytes: null,
    });
  });
});
