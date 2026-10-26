'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { buildApiUrl } from '@/lib/api';
import { checkReadiness, READINESS_PATH } from '@/lib/api/health';
import { EnvError } from '@/lib/env';
import { CheckRow, StatusBadge, type StatusTone } from './status-badge';

function endpointLabel(): string | null {
  try {
    return buildApiUrl(READINESS_PATH);
  } catch {
    return null;
  }
}

/** Calls the backend readiness check from the browser and shows status and latency. */
export function BackendPanel() {
  const t = useTranslations('SystemCheck.backend');
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['system-check', 'readiness'],
    queryFn: () => checkReadiness(),
    retry: false,
    staleTime: 0,
  });

  const endpoint = endpointLabel();
  const na = t('notAvailable');

  let tone: StatusTone = 'pending';
  let statusText = t('checking');
  if (!isFetching && data) {
    tone = data.ready ? 'ok' : 'warning';
    statusText = data.ready ? t('ok') : t('degraded');
  } else if (!isFetching && error) {
    tone = 'critical';
    statusText = t('unreachable');
  }

  return (
    <section
      aria-labelledby="backend-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="backend-title" className="font-display text-xl font-semibold">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('description')}</p>
        </div>
        <StatusBadge tone={tone}>{statusText}</StatusBadge>
      </div>

      <dl className="mt-4 divide-y divide-border" aria-live="polite">
        <CheckRow label={t('endpoint')}>{endpoint ?? na}</CheckRow>
        <CheckRow label={t('httpStatus')}>{data ? data.httpStatus : na}</CheckRow>
        <CheckRow label={t('database')}>
          {data?.db === 'up' ? t('dbUp') : data?.db === 'down' ? t('dbDown') : na}
        </CheckRow>
        <CheckRow label={t('responseTime')}>
          {data ? t('milliseconds', { value: data.durationMs.toFixed(0) }) : na}
        </CheckRow>
      </dl>

      {error && !isFetching ? (
        <p className="mt-4 rounded-xl bg-critical-50 px-4 py-3 text-sm text-critical-800 dark:bg-critical-900/30 dark:text-critical-200">
          {error instanceof EnvError ? t('configHint') : t('unreachableHint')}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void refetch()}
        disabled={isFetching}
        className="mt-5 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-surface-muted disabled:opacity-60"
      >
        {isFetching ? t('checking') : t('retry')}
      </button>
    </section>
  );
}
