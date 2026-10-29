'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { sortByP95, useApiMetrics } from '@/features/metrics/api';
import { MetricsSection, Stat } from './metrics-section';

const MB = 1024 * 1024;

/** GET /metrics/api: the routes table and the server's memory, event loop and uptime. */
export function ApiPanels() {
  const t = useTranslations('Metrics');
  const common = useTranslations('Common');
  const format = useFormatter();
  const metrics = useApiMetrics();
  const ms = (value: number | null) =>
    value === null
      ? t('noData')
      : t('ms', { value: format.number(value, { maximumFractionDigits: 1 }) });
  const mb = (bytes: number) =>
    t('mb', { value: format.number(bytes / MB, { maximumFractionDigits: 1 }) });

  if (metrics.isPending) {
    return (
      <div aria-busy="true" className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }
  if (metrics.isError) {
    return (
      <div className="rounded-card bg-surface p-6 text-center shadow-card ring-1 ring-border">
        <p className="text-sm text-muted">{common('loadError')}</p>
        <Button variant="secondary" className="mt-3" onClick={() => void metrics.refetch()}>
          {common('retry')}
        </Button>
      </div>
    );
  }

  const { routes, memory, eventLoop, uptimeSec } = metrics.data;
  const sorted = sortByP95(routes);

  return (
    <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
      <MetricsSection
        id="metrics-api"
        title={t('api.title')}
        intro={t('api.intro')}
        action={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {t('updated', {
                time: format.dateTime(new Date(metrics.dataUpdatedAt), { timeStyle: 'medium' }),
              })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={metrics.isFetching}
              onClick={() => void metrics.refetch()}
            >
              {t('refresh')}
            </Button>
          </div>
        }
      >
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">{t('api.empty')}</p>
        ) : (
          <div className="-mx-5 max-h-[28rem] overflow-auto sm:-mx-6">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">{t('api.caption')}</caption>
              <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold sm:px-6">
                    {t('api.route')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    {t('api.p50')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    {t('api.p95')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    {t('api.p99')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    {t('api.count')}
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-6">
                    {t('api.errors')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((route) => (
                  <tr key={route.route}>
                    <th
                      scope="row"
                      className="max-w-[18rem] truncate px-5 py-2.5 text-left font-mono text-xs font-normal sm:px-6"
                      title={route.route}
                    >
                      {route.route}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {ms(route.p50)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">
                      {ms(route.p95)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {ms(route.p99)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {format.number(route.total)}
                    </td>
                    <td
                      className={`px-5 py-2.5 text-right tabular-nums sm:px-6 ${
                        route.errors5xx > 0
                          ? 'font-semibold text-critical-700 dark:text-critical-300'
                          : 'text-muted'
                      }`}
                    >
                      {format.number(route.errors5xx)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MetricsSection>

      <MetricsSection id="metrics-backend" title={t('backend.title')}>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Stat label={t('backend.rss')} value={mb(memory.rss)} />
          <Stat
            label={t('backend.heapUsed')}
            value={mb(memory.heapUsed)}
            detail={t('backend.heapOf', { total: mb(memory.heapTotal) })}
          />
          <Stat
            label={t('backend.lag')}
            value={ms(eventLoop.p99Ms)}
            detail={t('backend.lagDetail', {
              mean: ms(eventLoop.meanMs),
              p99: ms(eventLoop.p99Ms),
              max: ms(eventLoop.maxMs),
            })}
          />
          <Stat
            label={t('backend.uptime')}
            value={t('backend.uptimeValue', {
              hours: Math.floor(uptimeSec / 3600),
              minutes: Math.floor((uptimeSec % 3600) / 60),
            })}
          />
        </dl>
      </MetricsSection>
    </div>
  );
}
