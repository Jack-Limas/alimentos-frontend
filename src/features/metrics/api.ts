'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError, NETWORK_ERROR_CODE, type DataResponse } from '@/lib/api';
import type { VitalName } from './vitals';

/** GET /metrics/api (contract 4.10). Percentiles use the last 500 requests of each route. */
export interface RouteMetrics {
  route: string;
  count: number;
  total: number;
  errors5xx: number;
  p50: number | null;
  p75: number | null;
  p95: number | null;
  p99: number | null;
}

export interface ApiMetricsReport {
  routes: RouteMetrics[];
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  eventLoop: { meanMs: number; p99Ms: number; maxMs: number };
  uptimeSec: number;
}

export interface VitalSummary {
  name: VitalName;
  count: number;
  p75: number | null;
}

/** GET /metrics/web-vitals: p75 of the last 2,000 samples. */
export interface WebVitalsReport {
  byMetric: VitalSummary[];
  byPage: (VitalSummary & { page: string })[];
}

export interface BenchmarkMeasurement {
  durationMs: number;
  eventLoop: { maxMs: number; p99Ms: number };
  probe: { intervalMs: number; ticks: number; expectedTicks: number; maxDriftMs: number };
}

/** POST /benchmarks/worker-threads. */
export interface BenchmarkReport {
  size: number;
  mainThread: BenchmarkMeasurement;
  workerPool: BenchmarkMeasurement;
  sameResult: boolean;
  result: { size: number; products: number; lots: number; checksum: number };
}

/** The backend's limits (1,000 to 30,000 synthetic orders); a 400 may lower the maximum. */
export const BENCHMARK_MIN = 1_000;
export const BENCHMARK_DEFAULT_MAX = 30_000;

export const metricsKeys = {
  api: ['metrics', 'api'] as const,
  webVitals: ['metrics', 'web-vitals'] as const,
};

/** Routes by p95, slowest first; routes without samples go last. */
export function sortByP95(routes: readonly RouteMetrics[]): RouteMetrics[] {
  return [...routes].sort((a, b) => (b.p95 ?? -1) - (a.p95 ?? -1));
}

export function useApiMetrics() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: metricsKeys.api,
    queryFn: async () => (await authFetch<DataResponse<ApiMetricsReport>>('/metrics/api')).data,
    refetchInterval: 15_000,
  });
}

export function useWebVitalsReport() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: metricsKeys.webVitals,
    queryFn: async () =>
      (await authFetch<DataResponse<WebVitalsReport>>('/metrics/web-vitals')).data,
    refetchInterval: 30_000,
  });
}

export function useBenchmark() {
  const { authFetch } = useAuth();
  return useMutation({
    mutationFn: async (size: number) =>
      (
        await authFetch<DataResponse<BenchmarkReport>>('/benchmarks/worker-threads', {
          method: 'POST',
          json: { size },
        })
      ).data,
  });
}

/**
 * The maximum size a 400 on `size` names ("Too big: expected number to be
 * <=30000"), so the size picker follows the backend instead of a copy of it.
 */
export function benchmarkMaxFrom(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return null;
  const issues = error.details.issues;
  if (!Array.isArray(issues)) return null;
  for (const issue of issues as { path?: unknown; message?: unknown }[]) {
    if (issue.path !== 'size' || typeof issue.message !== 'string') continue;
    const match = /<=?\s*([\d_,.]+)/.exec(issue.message);
    const max = match ? Number(match[1]?.replace(/[_,.]/g, '')) : NaN;
    if (Number.isInteger(max) && max >= BENCHMARK_MIN) return max;
  }
  return null;
}

export type BenchmarkErrorKey = 'running' | 'tooBig' | 'forbidden' | 'network' | 'unexpected';

/** i18n keys of Metrics.benchmark.errors; 409 BENCHMARK_RUNNING is the expected one. */
export function benchmarkErrorKey(error: unknown): BenchmarkErrorKey {
  if (!(error instanceof ApiError)) return 'unexpected';
  if (error.code === 'BENCHMARK_RUNNING') return 'running';
  if (error.code === NETWORK_ERROR_CODE) return 'network';
  if (error.status === 403) return 'forbidden';
  if (benchmarkMaxFrom(error) !== null) return 'tooBig';
  return 'unexpected';
}
