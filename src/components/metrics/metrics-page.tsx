'use client';

import { useTranslations } from 'next-intl';
import { ApiPanels } from './api-panels';
import { BenchmarkPanel } from './benchmark-panel';
import { BrowserPanel } from './browser-panel';
import { WebVitalsPanel } from './web-vitals-panel';

/** ADMIN: API, server, Web Vitals, this browser and the Worker Threads benchmark. */
export function MetricsPage() {
  const t = useTranslations('Metrics');

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
      </header>

      <ApiPanels />
      <WebVitalsPanel />
      <BrowserPanel />
      <BenchmarkPanel />
    </div>
  );
}
