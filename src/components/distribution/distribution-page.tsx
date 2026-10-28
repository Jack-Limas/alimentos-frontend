'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSnapshot } from '@/features/distribution/api';
import { STRATEGY_WEIGHTS, type Weights } from '@/features/distribution/engine';
import { useEngineWorker } from '@/features/distribution/use-engine-worker';
import { calendarDateToUtc } from '@/lib/dates';
import { CompareStrategies } from './compare-strategies';
import { GenerateProposal } from './generate-proposal';
import { ProposalHistory } from './proposal-history';
import { Simulator } from './simulator';

export function DistributionPage() {
  const t = useTranslations('Distribution');
  const common = useTranslations('Common');
  const format = useFormatter();
  const snapshot = useSnapshot();
  const engine = useEngineWorker();
  const [weights, setWeights] = useState<Weights>({ ...STRATEGY_WEIGHTS.BALANCED });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t('intro')}</p>
        {snapshot.data ? (
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm font-semibold">
            <span>{t('pending', { count: snapshot.data.orders.length })}</span>
            <span className="text-muted">
              {t('businessDate', {
                date: format.dateTime(calendarDateToUtc(snapshot.data.businessDate), {
                  dateStyle: 'full',
                  timeZone: 'UTC',
                }),
              })}
            </span>
          </p>
        ) : null}
      </header>

      {snapshot.isPending ? (
        <div aria-busy="true" className="space-y-4">
          <p role="status" className="sr-only">
            {common('loading')}
          </p>
          <Skeleton className="h-96 rounded-card" />
        </div>
      ) : snapshot.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void snapshot.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Simulator
              snapshot={snapshot.data}
              weights={weights}
              onWeightsChange={setWeights}
              engine={engine}
            />
            <GenerateProposal weights={weights} />
          </div>
          {snapshot.data.orders.length > 0 ? (
            <CompareStrategies snapshot={snapshot.data} engine={engine} />
          ) : null}
        </>
      )}

      <ProposalHistory />
    </div>
  );
}
