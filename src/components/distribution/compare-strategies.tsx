'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { compareRankings, type Comparison } from '@/features/distribution/compare';
import type { EngineClient } from '@/features/distribution/engine-client';
import {
  RULE_STRATEGIES,
  type RankedOrder,
  type RuleStrategyName,
} from '@/features/distribution/engine';
import type { SnapshotDto } from '@/features/distribution/types';

const TOP = 10;

const columnTone: Record<RuleStrategyName, string> = {
  BALANCED: 'border-forest-500',
  URGENCY_FIRST: 'border-expiry-400',
  WASTE_FIRST: 'border-lagoon-500',
};

/** Runs the three rule strategies in the Worker and shows their top 10 side by side. */
export function CompareStrategies({
  snapshot,
  engine,
}: {
  snapshot: SnapshotDto;
  engine: EngineClient;
}) {
  const t = useTranslations('Distribution');
  const [comparison, setComparison] = useState<Comparison | null>(null);

  useEffect(() => {
    let active = true;
    // Full rankings without lines: positions are compared on every order.
    const runs = RULE_STRATEGIES.map((strategy) =>
      engine
        .run(
          {
            snapshot,
            strategy,
            detail: 'summary',
            top: snapshot.orders.length,
            progressEvery: 1e9,
          },
          { channel: `compare-${strategy}` },
        )
        .then((outcome) => [strategy, outcome] as const),
    );
    Promise.all(runs)
      .then((outcomes) => {
        if (!active || outcomes.some(([, outcome]) => outcome.status !== 'done')) return;
        const rankings = Object.fromEntries(
          outcomes.map(([strategy, outcome]) => [
            strategy,
            outcome.status === 'done' ? outcome.result.ranking : [],
          ]),
        ) as Record<RuleStrategyName, RankedOrder[]>;
        setComparison(compareRankings(rankings, TOP));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [engine, snapshot]);

  const codes = new Map(snapshot.orders.map((order) => [order.id, order.code]));

  return (
    <section
      aria-labelledby="compare-title"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
    >
      <h2 id="compare-title" className="font-display text-xl font-semibold">
        {t('compare.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('compare.intro')}</p>

      {comparison === null ? (
        <p role="status" className="mt-4 text-sm text-muted">
          {t('compare.running')}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {RULE_STRATEGIES.map((strategy) => (
            <div
              key={strategy}
              className={`rounded-2xl border-t-4 bg-surface-muted/50 p-3 ring-1 ring-border ${columnTone[strategy]}`}
            >
              <h3 className="font-display font-semibold">{t(`strategies.${strategy}`)}</h3>
              <ol className="mt-2 space-y-1.5">
                {comparison[strategy].map((cell) => (
                  <li
                    key={cell.orderId}
                    className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${
                      cell.changed
                        ? 'bg-expiry-100/80 font-semibold ring-1 ring-expiry-300 dark:bg-expiry-900/30 dark:ring-expiry-700'
                        : ''
                    }`}
                  >
                    <span className="w-6 text-right tabular-nums text-muted">{cell.rank}</span>
                    <span className="flex-1">{codes.get(cell.orderId)}</span>
                    <Shift shift={cell.shift} changed={cell.changed} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Shift({ shift, changed }: { shift: number | null; changed: boolean }) {
  const t = useTranslations('Distribution.compare');
  if (shift === null) {
    return changed ? (
      <span className="text-xs text-expiry-800 dark:text-expiry-200">{t('changed')}</span>
    ) : null;
  }
  if (shift === 0) return <span className="sr-only">{t('same')}</span>;
  const up = shift > 0;
  return (
    <span
      className={`text-xs font-semibold ${up ? 'text-brand-700 dark:text-brand-300' : 'text-critical-700 dark:text-critical-300'}`}
    >
      <span aria-hidden="true">{up ? '▲' : '▼'} </span>
      {t(up ? 'up' : 'down', { places: Math.abs(shift) })}
    </span>
  );
}
