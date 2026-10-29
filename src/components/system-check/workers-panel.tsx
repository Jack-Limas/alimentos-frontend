'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { getSharedAlertsClient } from '@/features/alerts/browser-shared-alerts';
import { chooseAlertsMode } from '@/features/alerts/shared-alerts-client';
import { poolAvailable, poolSize } from '@/features/distribution/parallel';
import { versionOf } from '@/features/pwa/service-worker';
import { useClientValue } from '@/hooks/use-client-value';
import { CheckRow, StatusBadge } from './status-badge';

const noSubscribe = () => () => undefined;
const zero = () => 0;

/** Tabs connected to the alerts SharedWorker (this one included). */
function useConnectedTabs(enabled: boolean): number {
  return useSyncExternalStore(
    enabled ? getSharedAlertsClient().subscribe : noSubscribe,
    enabled ? () => getSharedAlertsClient().getState().ports : zero,
    zero,
  );
}

/** SharedWorker, Service Worker and the SharedArrayBuffer pool, as this browser sees them. */
export function WorkersPanel() {
  const t = useTranslations('SystemCheck');
  const mode = useClientValue(() => chooseAlertsMode(window), null);
  const tabs = useConnectedTabs(mode === 'shared');
  const swSupported = useClientValue(() => 'serviceWorker' in navigator, null);
  const swVersion = useClientValue(
    () => versionOf(navigator.serviceWorker?.controller?.scriptURL ?? null),
    null,
  );
  const canPool = useClientValue(() => poolAvailable(window), null);
  const workers = useClientValue(() => poolSize(navigator.hardwareConcurrency), 1);

  const pending = mode === null;
  const allGood = mode === 'shared' && swVersion !== null && canPool === true;
  const detecting = <span className="font-sans font-normal text-muted">{t('detecting')}</span>;

  return (
    <section
      aria-labelledby="workers-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="workers-title" className="font-display text-xl font-semibold">
            {t('workers.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('workers.description')}</p>
        </div>
        <StatusBadge tone={pending ? 'pending' : allGood ? 'ok' : 'warning'}>
          {pending ? t('detecting') : allGood ? t('workers.ready') : t('workers.partial')}
        </StatusBadge>
      </div>

      <dl className="mt-4 divide-y divide-border">
        <CheckRow label={t('workers.sharedWorker')}>
          {pending
            ? detecting
            : mode === 'shared'
              ? t('workers.sharedSupported', { count: Math.max(tabs, 1) })
              : t('workers.sharedFallback')}
        </CheckRow>
        <CheckRow label={t('workers.serviceWorker')}>
          {swSupported === null
            ? detecting
            : !swSupported
              ? t('workers.swUnsupported')
              : swVersion
                ? t('workers.swActive', { version: swVersion })
                : t('workers.swInactive')}
        </CheckRow>
        <CheckRow label={t('workers.pool')}>
          {canPool === null
            ? detecting
            : canPool
              ? t('workers.poolAvailable', { count: workers })
              : t('workers.poolUnavailable')}
        </CheckRow>
      </dl>
    </section>
  );
}
