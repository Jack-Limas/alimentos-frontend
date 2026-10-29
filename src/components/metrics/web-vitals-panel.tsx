'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { useWebVitalsReport } from '@/features/metrics/api';
import {
  rateVital,
  VITAL_NAMES,
  VITAL_THRESHOLDS,
  vitalUnit,
  type VitalName,
} from '@/features/metrics/vitals';
import { MetricsSection, RatingChip } from './metrics-section';

/** GET /metrics/web-vitals: p75 per metric and per page, rated with Google's thresholds. */
export function WebVitalsPanel() {
  const t = useTranslations('Metrics');
  const common = useTranslations('Common');
  const format = useFormatter();
  const report = useWebVitalsReport();

  const value = (name: VitalName, amount: number) =>
    vitalUnit(name) === 'ms'
      ? t('ms', { value: format.number(Math.round(amount)) })
      : format.number(amount, { maximumFractionDigits: 3 });

  return (
    <MetricsSection id="metrics-vitals" title={t('vitals.title')} intro={t('vitals.intro')}>
      {report.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : report.isError ? (
        <p className="text-sm text-muted">{common('loadError')}</p>
      ) : (
        <div className="space-y-5">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {VITAL_NAMES.map((name) => {
              const summary = report.data.byMetric.find((entry) => entry.name === name);
              const p75 = summary?.p75 ?? null;
              const rating = p75 === null ? null : rateVital(name, p75);
              const { good, poor } = VITAL_THRESHOLDS[name];
              return (
                <li key={name} className="rounded-2xl bg-surface-muted/70 p-4 ring-1 ring-border">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-lg font-semibold">{name}</span>
                    <span className="text-xs text-muted">
                      {t('vitals.samplesCount', { count: summary?.count ?? 0 })}
                    </span>
                  </p>
                  <p className="text-xs text-muted">{t(`vitals.names.${name}`)}</p>
                  <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
                    {p75 === null ? t('noData') : value(name, p75)}
                  </p>
                  <div className="mt-2 min-h-6">
                    {rating ? (
                      <RatingChip rating={rating} label={t(`vitals.rating.${rating}`)} />
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {t('vitals.thresholds', { good: value(name, good), poor: value(name, poor) })}
                  </p>
                </li>
              );
            })}
          </ul>

          {report.data.byPage.length === 0 ? (
            <p className="text-sm text-muted">{t('vitals.empty')}</p>
          ) : (
            <div>
              <h3 className="font-display text-lg font-semibold">{t('vitals.byPage')}</h3>
              <div className="-mx-5 mt-2 max-h-[24rem] overflow-auto sm:-mx-6">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <caption className="sr-only">{t('vitals.caption')}</caption>
                  <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold sm:px-6">
                        {t('vitals.page')}
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        {t('vitals.metric')}
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">
                        {t('vitals.p75')}
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        {t('vitals.ratingColumn')}
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold sm:px-6">
                        {t('vitals.samples')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.data.byPage.map((entry) => {
                      const rating = entry.p75 === null ? null : rateVital(entry.name, entry.p75);
                      return (
                        <tr key={`${entry.page}-${entry.name}`}>
                          <td className="px-5 py-2.5 font-mono text-xs sm:px-6">{entry.page}</td>
                          <td className="px-3 py-2.5 font-semibold">{entry.name}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                            {entry.p75 === null ? t('noData') : value(entry.name, entry.p75)}
                          </td>
                          <td className="px-3 py-2.5">
                            {rating ? (
                              <RatingChip rating={rating} label={t(`vitals.rating.${rating}`)} />
                            ) : null}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums sm:px-6">
                            {format.number(entry.count)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </MetricsSection>
  );
}
