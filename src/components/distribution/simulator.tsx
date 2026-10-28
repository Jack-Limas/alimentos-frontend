'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PriorityBadge } from '@/components/orders/order-badges';
import { Icon } from '@/components/ui/icons';
import type { EngineClient } from '@/features/distribution/engine-client';
import type { FulfillmentStatus, Weights } from '@/features/distribution/engine';
import type { SnapshotDto } from '@/features/distribution/types';
import type { EngineResult } from '@/features/distribution/worker-protocol';
import { FlipList } from './flip-list';
import { StrategyWeights } from './strategy-weights';

/** Weights settle for this long before the Worker recomputes. */
export const SIMULATION_DEBOUNCE_MS = 250;
const TOP = 12;

type SimulationState =
  | { status: 'running'; served: number; total: number; previous: Done | null }
  | Done
  | { status: 'error' };
interface Done {
  status: 'done';
  result: EngineResult;
  durationMs: number;
}

export const fulfillmentTone: Record<FulfillmentStatus, string> = {
  FULL: 'bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800',
  PARTIAL:
    'bg-expiry-100 text-expiry-800 ring-expiry-200 dark:bg-expiry-900/40 dark:text-expiry-200 dark:ring-expiry-800',
  UNSERVED:
    'bg-critical-100 text-critical-700 ring-critical-200 dark:bg-critical-900/40 dark:text-critical-200 dark:ring-critical-800',
};

export function Simulator({
  snapshot,
  weights,
  onWeightsChange,
  engine,
}: {
  snapshot: SnapshotDto;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  engine: EngineClient;
}) {
  const t = useTranslations('Distribution');
  const [state, setState] = useState<SimulationState>({
    status: 'running',
    served: 0,
    total: snapshot.orders.length,
    previous: null,
  });

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setState((current) => ({
        status: 'running',
        served: 0,
        total: snapshot.orders.length,
        previous:
          current.status === 'done'
            ? current
            : current.status === 'running'
              ? current.previous
              : null,
      }));
      engine
        .run(
          { snapshot, strategy: 'BALANCED', weights, progressEvery: 25 },
          {
            channel: 'simulator',
            onProgress: (served, total) => {
              if (!active) return;
              setState((current) =>
                current.status === 'running' ? { ...current, served, total } : current,
              );
            },
          },
        )
        .then((outcome) => {
          // A newer run replaced this one, or the page is gone: keep what is shown.
          if (!active || outcome.status !== 'done') return;
          setState({ status: 'done', result: outcome.result, durationMs: outcome.durationMs });
        })
        .catch(() => {
          if (active) setState({ status: 'error' });
        });
    }, SIMULATION_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [engine, snapshot, weights]);

  const shown =
    state.status === 'done' ? state : state.status === 'running' ? state.previous : null;
  const orders = new Map(snapshot.orders.map((order) => [order.id, order]));
  const top = shown?.result.ranking.slice(0, TOP) ?? [];

  return (
    <section
      aria-labelledby="simulator-title"
      className="space-y-5 rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="simulator-title" className="font-display text-xl font-semibold">
            {t('simulator.title')}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-lagoon-700 dark:text-lagoon-300">
            <Icon name="flame" className="size-4" />
            {t('simulator.notice')}
          </p>
        </div>
        <p role="status" aria-live="polite" className="text-sm font-semibold text-muted">
          {state.status === 'running'
            ? t('simulator.running', { served: state.served, total: state.total })
            : state.status === 'done'
              ? t('simulator.done', { ms: state.durationMs })
              : t('simulator.error')}
        </p>
      </div>

      <StrategyWeights weights={weights} onChange={onWeightsChange} />

      {snapshot.orders.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
          {t('simulator.empty')}
        </p>
      ) : shown ? (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['ordersFull', 'ordersPartial', 'ordersUnserved', 'linesCount'] as const).map(
              (key) => (
                <div key={key} className="rounded-2xl bg-surface-muted/70 p-3 ring-1 ring-border">
                  <dt className="text-xs font-semibold text-muted">{t(`simulator.kpis.${key}`)}</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {shown.result.summary[key]}
                  </dd>
                </div>
              ),
            )}
          </dl>
          <div>
            <h3 className="text-sm font-semibold text-muted">
              {t('simulator.top', { count: top.length })}
            </h3>
            <FlipList
              order={top.map((entry) => entry.orderId)}
              label={t('simulator.rankingLabel')}
              className={`mt-2 space-y-2 transition-opacity ${state.status === 'running' ? 'opacity-70' : ''}`}
            >
              {top.map((entry) => {
                const order = orders.get(entry.orderId);
                return (
                  <li
                    key={entry.orderId}
                    data-flip-key={entry.orderId}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-background/60 px-3 py-2.5 ring-1 ring-border"
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-forest-700 font-display text-sm font-semibold text-white dark:bg-forest-500">
                      {entry.rank}
                    </span>
                    <span className="font-display font-semibold">{order?.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">
                      {order?.customerName}
                    </span>
                    {order ? <PriorityBadge priority={order.priority} /> : null}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${fulfillmentTone[entry.status]}`}
                    >
                      {t(`fulfillment.${entry.status}`)}
                    </span>
                    <span className="w-20 text-right font-display text-sm font-semibold tabular-nums">
                      {t('score', { score: entry.score })}
                    </span>
                  </li>
                );
              })}
            </FlipList>
          </div>
        </>
      ) : null}
    </section>
  );
}
