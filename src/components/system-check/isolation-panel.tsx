'use client';

import { useTranslations } from 'next-intl';
import { useClientValue } from '@/hooks/use-client-value';
import { CheckRow, StatusBadge } from './status-badge';

/** Shows whether COOP/COEP made the page cross-origin isolated. */
export function IsolationPanel() {
  const t = useTranslations('SystemCheck');
  const isolated = useClientValue(() => window.crossOriginIsolated, null);
  const sabType = useClientValue(() => typeof SharedArrayBuffer, null);
  const cores = useClientValue(() => navigator.hardwareConcurrency, null);

  const pending = isolated === null;
  const pendingText = <span className="font-sans font-normal text-muted">{t('detecting')}</span>;

  return (
    <section
      aria-labelledby="isolation-title"
      className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="isolation-title" className="font-display text-xl font-semibold">
            {t('isolation.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('isolation.description')}</p>
        </div>
        <StatusBadge tone={pending ? 'pending' : isolated ? 'ok' : 'critical'}>
          {pending ? t('detecting') : isolated ? t('isolation.ready') : t('isolation.notReady')}
        </StatusBadge>
      </div>

      <dl className="mt-4 divide-y divide-border">
        <CheckRow label={t('isolation.crossOriginIsolated')}>
          {pending ? pendingText : String(isolated)}
        </CheckRow>
        <CheckRow label={t('isolation.sharedArrayBuffer')}>
          {sabType === null ? pendingText : `"${sabType}"`}
        </CheckRow>
        <CheckRow label={t('isolation.hardwareConcurrency')}>
          {cores === null ? pendingText : cores}
        </CheckRow>
      </dl>
    </section>
  );
}
