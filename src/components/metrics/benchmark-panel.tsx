'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  BENCHMARK_DEFAULT_MAX,
  BENCHMARK_MIN,
  benchmarkErrorKey,
  benchmarkMaxFrom,
  useBenchmark,
  type BenchmarkErrorKey,
  type BenchmarkReport,
} from '@/features/metrics/api';
import { Link } from '@/i18n/navigation';
import { BenchmarkChart } from './benchmark-chart';
import { MetricsSection } from './metrics-section';

const STEP = 1_000;

/** POST /benchmarks/worker-threads: main thread vs worker_threads pool on the server. */
export function BenchmarkPanel() {
  const t = useTranslations('Metrics.benchmark');
  const metrics = useTranslations('Metrics');
  const format = useFormatter();
  const id = useId();
  const benchmark = useBenchmark();
  // The backend's maximum: 30,000 unless a 400 says otherwise.
  const [max, setMax] = useState(BENCHMARK_DEFAULT_MAX);
  const [size, setSize] = useState(10_000);
  const [runs, setRuns] = useState<BenchmarkReport[]>([]);
  const [error, setError] = useState<BenchmarkErrorKey | null>(null);

  const ms = (value: number) =>
    metrics('ms', { value: format.number(value, { maximumFractionDigits: 1 }) });

  function run() {
    setError(null);
    benchmark.mutate(size, {
      onSuccess: (report) => {
        setRuns((current) => [report, ...current]);
      },
      onError: (caught) => {
        const backendMax = benchmarkMaxFrom(caught);
        if (backendMax !== null) {
          setMax(backendMax);
          setSize((current) => Math.min(current, backendMax));
        }
        setError(benchmarkErrorKey(caught));
      },
    });
  }

  const latest = runs[0];

  return (
    <MetricsSection
      id="metrics-benchmark"
      title={t('title')}
      intro={t('intro')}
      action={
        <Link
          href="/app/lab/performance"
          className="text-sm font-semibold text-lagoon-700 underline-offset-4 hover:underline dark:text-lagoon-300"
        >
          {t('labLink')}
        </Link>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor={`${id}-size`} className="flex justify-between text-sm font-semibold">
            {t('size')}
            <span className="tabular-nums">{t('sizeValue', { size: format.number(size) })}</span>
          </label>
          <input
            id={`${id}-size`}
            type="range"
            min={BENCHMARK_MIN}
            max={max}
            step={STEP}
            value={size}
            disabled={benchmark.isPending}
            onChange={(event) => {
              setSize(Number(event.target.value));
            }}
            aria-describedby={`${id}-hint`}
            className="mt-2 w-full accent-berry-600"
          />
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {t('sizeHint', { min: format.number(BENCHMARK_MIN), max: format.number(max) })}
          </p>
        </div>
        <Button
          variant="berry"
          disabled={benchmark.isPending}
          aria-busy={benchmark.isPending || undefined}
          onClick={run}
        >
          {benchmark.isPending ? t('running') : t('run', { size: format.number(size) })}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-critical-50 px-3.5 py-2.5 text-sm font-semibold text-critical-800 ring-1 ring-critical-200 dark:bg-critical-900/30 dark:text-critical-200 dark:ring-critical-800"
        >
          {t(`errors.${error}`, { max: format.number(max) })}
        </p>
      ) : null}

      {latest ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_3fr]">
          <BenchmarkChart run={latest} />
          <div>
            <h3 className="text-sm font-semibold">{t('results')}</h3>
            <div className="-mx-5 mt-2 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">{t('caption')}</caption>
                <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      {t('mode')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      {t('duration')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      {t('lagMax')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      {t('drift')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      {t('ticks')}
                    </th>
                  </tr>
                </thead>
                {runs.map((report, index) => (
                  <tbody
                    key={runs.length - index}
                    className="divide-y divide-border border-t border-border"
                  >
                    <tr className="bg-surface-muted/40">
                      <th scope="rowgroup" colSpan={5} className="px-3 py-2 text-xs font-semibold">
                        <span className="mr-2">
                          {t('run_n', { n: runs.length - index, size: format.number(report.size) })}
                        </span>
                        <Chip tone={report.sameResult ? 'brand' : 'critical'}>
                          {report.sameResult ? t('sameYes') : t('sameNo')}
                        </Chip>
                      </th>
                    </tr>
                    {(
                      [
                        ['mainThread', report.mainThread],
                        ['workerPool', report.workerPool],
                      ] as const
                    ).map(([mode, measurement]) => (
                      <tr key={mode}>
                        <th scope="row" className="px-3 py-2 text-left font-semibold">
                          {t(mode)}
                        </th>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {ms(measurement.durationMs)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {ms(measurement.eventLoop.maxMs)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {ms(measurement.probe.maxDriftMs)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {t('ticksValue', {
                            ticks: measurement.probe.ticks,
                            expected: measurement.probe.expectedTicks,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">{t('empty')}</p>
      )}
    </MetricsSection>
  );
}
