'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useClientValue } from '@/hooks/use-client-value';
import {
  measureMemory,
  memorySourceOf,
  readLoadTiming,
  type LoadTiming,
  type MemoryReading,
} from '@/features/metrics/browser-perf';
import { MetricsSection, Stat } from './metrics-section';

const MB = 1024 * 1024;

/** Which memory API this browser offers, without measuring yet. */
function readSource() {
  const perf = performance as Performance & {
    measureUserAgentSpecificMemory?: unknown;
    memory?: { usedJSHeapSize: number };
  };
  return memorySourceOf({
    crossOriginIsolated: globalThis.crossOriginIsolated,
    ...(perf.measureUserAgentSpecificMemory
      ? { measureUserAgentSpecificMemory: () => Promise.resolve({ bytes: 0 }) }
      : {}),
    ...(perf.memory ? { legacyMemory: perf.memory } : {}),
  });
}

/** This browser: Navigation Timing of the current load and the page's memory. */
export function BrowserPanel() {
  const t = useTranslations('Metrics');
  const format = useFormatter();
  const [timing, setTiming] = useState<LoadTiming | null | undefined>(undefined);
  const [memory, setMemory] = useState<MemoryReading | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [memoryFailed, setMemoryFailed] = useState(false);
  const source = useClientValue(readSource, 'none');

  useEffect(() => {
    // loadEventEnd is 0 until the load event finishes: read again once it has.
    const read = () => {
      setTiming(readLoadTiming());
    };
    const timer = window.setTimeout(read, 0);
    window.addEventListener('load', read);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', read);
    };
  }, []);

  async function measure() {
    setMeasuring(true);
    setMemoryFailed(false);
    try {
      setMemory(await measureMemory());
    } catch {
      setMemoryFailed(true);
    } finally {
      setMeasuring(false);
    }
  }

  const ms = (value: number | null) =>
    value === null ? t('frontend.pending') : t('ms', { value: format.number(value) });

  return (
    <MetricsSection id="metrics-browser" title={t('frontend.title')} intro={t('frontend.intro')}>
      {timing === null ? (
        <p className="text-sm text-muted">{t('frontend.timingUnavailable')}</p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label={t('frontend.ttfb')} value={timing ? ms(timing.ttfb) : '—'} />
          <Stat
            label={t('frontend.domContentLoaded')}
            value={timing ? ms(timing.domContentLoaded) : '—'}
          />
          <Stat label={t('frontend.load')} value={timing ? ms(timing.load) : '—'} />
        </dl>
      )}

      <div className="mt-5 rounded-2xl bg-surface-muted/70 p-4 ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('frontend.memory')}
            </h3>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums" aria-live="polite">
              {memory?.bytes != null
                ? t('mb', { value: format.number(memory.bytes / MB, { maximumFractionDigits: 1 }) })
                : '—'}
            </p>
          </div>
          {source !== 'none' ? (
            <Button
              variant="lagoon"
              size="sm"
              disabled={measuring}
              aria-busy={measuring || undefined}
              onClick={() => void measure()}
              icon={
                measuring ? (
                  <span
                    aria-hidden="true"
                    className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
                  />
                ) : undefined
              }
            >
              {measuring ? t('frontend.measuring') : t('frontend.measure')}
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted [overflow-wrap:anywhere]">
          {t(`frontend.sources.${memory?.source ?? source}`)}
        </p>
        {measuring ? (
          <p role="status" className="mt-1 text-xs text-muted">
            {t('frontend.measuringHint')}
          </p>
        ) : null}
        {memoryFailed ? (
          <p
            role="alert"
            className="mt-1 text-xs font-semibold text-critical-700 dark:text-critical-300"
          >
            {t('frontend.memoryError')}
          </p>
        ) : null}
      </div>
    </MetricsSection>
  );
}
