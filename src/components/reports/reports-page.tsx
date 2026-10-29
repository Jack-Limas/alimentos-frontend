'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, inputClass, selectClass } from '@/components/ui/field';
import { Icon, type IconName } from '@/components/ui/icons';
import { useAuth } from '@/features/auth/use-auth';
import {
  downloadReport,
  MAX_RANGE_DAYS,
  rangeDays,
  REPORT_HAS_RANGE,
  REPORT_KINDS,
  saveBlob,
  type ReportDownload,
  type ReportFormat,
  type ReportKind,
  type ReportLocale,
} from '@/features/reports/reports';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import { addDays, businessToday } from '@/lib/dates';

type ReportErrorKey = 'invalid' | 'forbidden' | 'network' | 'unexpected';

function errorKey(error: unknown): ReportErrorKey {
  if (!(error instanceof ApiError)) return 'unexpected';
  if (error.code === NETWORK_ERROR_CODE) return 'network';
  if (error.status === 403) return 'forbidden';
  if (error.status === 400) return 'invalid';
  return 'unexpected';
}

const LOOK: Record<ReportKind, { icon: IconName; tile: string; edge: string }> = {
  inventory: { icon: 'boxes', tile: 'bg-brand-600 text-white', edge: 'var(--color-brand-800)' },
  orders: { icon: 'clipboard', tile: 'bg-lagoon-500 text-white', edge: 'var(--color-lagoon-700)' },
  waste: { icon: 'trash', tile: 'bg-berry-500 text-white', edge: 'var(--color-berry-700)' },
};

function ReportCard({
  kind,
  onDownloaded,
}: {
  kind: ReportKind;
  onDownloaded: (download: Omit<ReportDownload, 'id' | 'at'>) => void;
}) {
  const t = useTranslations('Reports');
  const { authRequest } = useAuth();
  const id = useId();
  const pageLocale = useLocale() as ReportLocale;
  const today = businessToday();
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [locale, setLocale] = useState<ReportLocale>(pageLocale);
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReportErrorKey | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const hasRange = REPORT_HAS_RANGE[kind];
  const days = rangeDays(from, to);
  const rangeInvalid = hasRange && (days === null || days > MAX_RANGE_DAYS);
  const look = LOOK[kind];

  async function download() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const result = await downloadReport(
        { kind, format, locale, ...(hasRange ? { from, to } : {}) },
        { authRequest, save: saveBlob, today },
      );
      onDownloaded(result);
      setDone(result.fileName);
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      aria-labelledby={`${id}-title`}
      className="flex flex-col rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${look.tile}`}
          style={{ boxShadow: `0 4px 0 0 ${look.edge}` }}
        >
          <Icon name={look.icon} />
        </span>
        <div>
          <h2 id={`${id}-title`} className="font-display text-xl font-semibold">
            {t(`kinds.${kind}.title`)}
          </h2>
          <p className="mt-1 text-sm text-muted">{t(`kinds.${kind}.description`)}</p>
        </div>
      </div>

      <div className="mt-5 grid flex-1 content-start gap-4">
        <fieldset>
          <legend className="text-sm font-semibold">{t('format')}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['csv', 'pdf'] as const).map((option) => (
              <label
                key={option}
                className={`flex h-11 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold ring-1 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                  format === option
                    ? 'bg-brand-600 text-white ring-brand-700'
                    : 'bg-surface text-foreground ring-border hover:bg-surface-muted'
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-format`}
                  value={option}
                  checked={format === option}
                  onChange={() => {
                    setFormat(option);
                  }}
                  className="sr-only"
                />
                {t(`formats.${option}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id={`${id}-locale`} label={t('language')}>
          <select
            id={`${id}-locale`}
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value as ReportLocale);
            }}
            className={selectClass}
          >
            <option value="es">{t('languages.es')}</option>
            <option value="en">{t('languages.en')}</option>
          </select>
        </Field>

        {hasRange ? (
          <div className="grid grid-cols-2 gap-3">
            <Field id={`${id}-from`} label={t('from')}>
              <input
                id={`${id}-from`}
                type="date"
                value={from}
                max={to}
                onChange={(event) => {
                  setFrom(event.target.value);
                }}
                aria-invalid={rangeInvalid || undefined}
                aria-describedby={rangeInvalid ? `${id}-range` : undefined}
                className={inputClass}
              />
            </Field>
            <Field id={`${id}-to`} label={t('to')}>
              <input
                id={`${id}-to`}
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(event) => {
                  setTo(event.target.value);
                }}
                aria-invalid={rangeInvalid || undefined}
                aria-describedby={rangeInvalid ? `${id}-range` : undefined}
                className={inputClass}
              />
            </Field>
            {rangeInvalid ? (
              <p
                id={`${id}-range`}
                className="col-span-2 text-xs font-semibold text-critical-700 dark:text-critical-300"
              >
                {t('rangeError', { max: MAX_RANGE_DAYS })}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-muted/70 px-3.5 py-3 text-sm text-muted">
            {t('today')}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <Button
          className="w-full"
          disabled={busy || rangeInvalid}
          aria-busy={busy || undefined}
          onClick={() => void download()}
          icon={<Icon name="in" className="size-4" />}
        >
          {busy ? t('downloading') : t('download', { format: t(`formats.${format}`) })}
        </Button>
        <p aria-live="polite" className="min-h-5 text-center text-xs">
          {error ? (
            <span className="font-semibold text-critical-700 dark:text-critical-300">
              {t(`errors.${error}`)}
            </span>
          ) : done ? (
            <span className="text-brand-700 dark:text-brand-300">{t('done', { file: done })}</span>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function History({ downloads }: { downloads: ReportDownload[] }) {
  const t = useTranslations('Reports.history');
  const metrics = useTranslations('Metrics');
  const format = useFormatter();
  const size = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${format.number(bytes / 1024, { maximumFractionDigits: 1 })} KB`
      : `${format.number(bytes / 1024 / 1024, { maximumFractionDigits: 2 })} MB`;

  return (
    <section
      aria-labelledby="reports-history"
      className="rounded-card bg-surface shadow-card ring-1 ring-border"
    >
      <h2 id="reports-history" className="px-5 pt-5 font-display text-xl font-semibold sm:px-6">
        {t('title')}
      </h2>
      {downloads.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-muted sm:px-6">{t('empty')}</p>
      ) : (
        <div className="mt-3 overflow-x-auto pb-2">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">{t('caption')}</caption>
            <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t('at')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('file')}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t('size')}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t('server')}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  {t('total')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {downloads.map((download) => (
                <tr key={download.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {format.dateTime(new Date(download.at), { timeStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{download.fileName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {size(download.bytes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {download.serverMs === null
                      ? metrics('noData')
                      : metrics('ms', { value: format.number(download.serverMs) })}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">
                    {metrics('ms', { value: format.number(download.totalMs) })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** ADMIN: one card per report (format, language, range) and this session's downloads. */
export function ReportsPage() {
  const t = useTranslations('Reports');
  const [downloads, setDownloads] = useState<ReportDownload[]>([]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {REPORT_KINDS.map((kind) => (
          <ReportCard
            key={kind}
            kind={kind}
            onDownloaded={(download) => {
              setDownloads((current) => [
                { ...download, id: current.length + 1, at: Date.now() },
                ...current,
              ]);
            }}
          />
        ))}
      </div>

      <History downloads={downloads} />
    </div>
  );
}
