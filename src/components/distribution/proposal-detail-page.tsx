'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCreateProposal, useProposal, useProposalAction } from '@/features/distribution/api';
import {
  degradedNotice,
  mapProposalError,
  type ProposalErrorView,
} from '@/features/distribution/proposal-errors';
import type { ProposalDetailDto, ProposalInput } from '@/features/distribution/types';
import { presetOf } from '@/features/distribution/weights';
import { Link, useRouter } from '@/i18n/navigation';
import { BUSINESS_TIME_ZONE } from '@/lib/dates';
import { AiExplanationCard } from './ai-explanation-card';
import { proposalStatusTone } from './proposal-history';
import { ProposalOrderCard } from './proposal-order-card';

const KPI_KEYS = [
  'ordersFull',
  'ordersPartial',
  'ordersUnserved',
  'itemsProcessed',
  'linesCount',
  'rescoreCount',
] as const;

/** The same request again: strategy, plus weights when they are not the strategy's own. */
function sameRequest(proposal: ProposalDetailDto, locale: 'es' | 'en'): ProposalInput {
  const preset = presetOf(proposal.weights);
  const own =
    proposal.strategy === 'AI_ASSISTED' ? preset === 'BALANCED' : preset === proposal.strategy;
  return own
    ? { strategy: proposal.strategy, locale }
    : { strategy: proposal.strategy, weights: proposal.weights, locale };
}

function Detail({ proposal }: { proposal: ProposalDetailDto }) {
  const t = useTranslations('Distribution');
  const units = useTranslations('Catalog.units.short');
  const format = useFormatter();
  const locale = useLocale() as 'es' | 'en';
  const toast = useToast();
  const router = useRouter();
  const confirm = useProposalAction('confirm');
  const discard = useProposalAction('discard');
  const regenerate = useCreateProposal();
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<ProposalErrorView | null>(null);
  const degraded = degradedNotice(proposal);
  const draft = proposal.status === 'DRAFT';
  const busy = confirm.isPending || discard.isPending || regenerate.isPending;
  const toPreparation = proposal.orders.filter((order) =>
    order.lines.some((line) => line.recommendedQty > 0),
  ).length;
  const orderIds = new Map(proposal.orders.map((order) => [order.code, order.orderId]));
  const totals = Object.entries(proposal.summary.totalRecommended)
    .map(
      ([unit, qty]) => `${format.number(qty, { maximumFractionDigits: 3 })} ${units(unit as 'KG')}`,
    )
    .join(' · ');

  async function act(action: 'confirm' | 'discard') {
    setFailure(null);
    setAsking(false);
    try {
      await (action === 'confirm' ? confirm : discard).mutateAsync(proposal.id);
      toast.show(t(action === 'confirm' ? 'detail.confirmed' : 'detail.discarded'));
    } catch (error) {
      setFailure(mapProposalError(error));
    }
  }

  async function generateAgain() {
    setFailure(null);
    try {
      const next = await regenerate.mutateAsync(sameRequest(proposal, locale));
      router.push(`/app/distribution/${next.id}`);
    } catch (error) {
      setFailure(mapProposalError(error));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/distribution"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <Icon name="chevron" className="size-4 rotate-180" />
        {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold tracking-tight">
            {t('detail.title', { strategy: t(`strategies.${proposal.strategy}`) })}
            <Chip tone={proposalStatusTone[proposal.status]}>{t(`status.${proposal.status}`)}</Chip>
          </h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
            <span>
              {t('detail.createdAt', {
                date: format.dateTime(new Date(proposal.createdAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: BUSINESS_TIME_ZONE,
                }),
              })}
            </span>
            <span>
              {t('detail.weights', {
                priority: proposal.weights.priority,
                deadline: proposal.weights.deadlineUrgency,
                expiry: proposal.weights.expiryPressure,
              })}
            </span>
          </p>
        </div>
        {draft ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => void act('discard')}>
              {t('detail.discard')}
            </Button>
            <Button
              size="lg"
              icon={<Icon name="check" />}
              disabled={busy}
              onClick={() => setAsking(true)}
            >
              {confirm.isPending ? t('detail.confirming') : t('detail.confirm')}
            </Button>
          </div>
        ) : (
          <p className="rounded-2xl bg-surface-muted px-4 py-2 text-sm font-semibold text-muted">
            {t('detail.readOnly', { status: t(`status.${proposal.status}`) })}
          </p>
        )}
      </header>

      {degraded ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card bg-expiry-50 p-4 text-expiry-900 ring-1 ring-expiry-200 dark:bg-expiry-900/30 dark:text-expiry-100 dark:ring-expiry-800"
        >
          <Icon name="flame" className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-semibold">{t('degraded.title')}</span>{' '}
            <span className="text-sm">{t(`degraded.${degraded}`)}</span>
          </p>
        </div>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-card bg-critical-50 p-4 text-critical-800 ring-1 ring-critical-200 dark:bg-critical-900/30 dark:text-critical-200 dark:ring-critical-800"
        >
          <p className="flex-1 font-semibold">{t(`errors.${failure.key}`)}</p>
          {failure.regenerate ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void generateAgain()}
            >
              {t('errors.regenerate')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {KPI_KEYS.map((key) => (
          <div key={key} className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border">
            <dt className="text-xs font-semibold text-muted">{t(`detail.kpis.${key}`)}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {proposal.summary[key]}
            </dd>
          </div>
        ))}
        <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border">
          <dt className="text-xs font-semibold text-muted">{t('detail.kpis.processingMs')}</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {t('detail.processing', { ms: proposal.processingMs })}
          </dd>
        </div>
      </dl>
      {totals ? <p className="text-sm font-semibold">{t('detail.totals', { totals })}</p> : null}

      <AiExplanationCard
        proposalId={proposal.id}
        insight={proposal.aiInsight}
        orderIds={orderIds}
      />

      <section aria-labelledby="plan-orders">
        <h2 id="plan-orders" className="font-display text-xl font-semibold">
          {t('detail.ordersTitle')}
        </h2>
        <ol className="mt-3 space-y-4">
          {proposal.orders.map((order) => (
            <ProposalOrderCard
              key={order.orderId}
              order={order}
              businessDate={proposal.businessDate}
            />
          ))}
        </ol>
      </section>

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title={t('detail.confirmTitle')}
        description={t('detail.confirmBody', { count: toPreparation })}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setAsking(false)}>
            {t('detail.cancel')}
          </Button>
          <Button icon={<Icon name="check" />} onClick={() => void act('confirm')}>
            {t('detail.confirmAction')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function ProposalDetailPage({ id }: { id: string }) {
  const t = useTranslations('Distribution');
  const common = useTranslations('Common');
  const proposal = useProposal(id);

  if (proposal.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          {common('loading')}
        </p>
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }
  if (proposal.isError) {
    const notFound = mapProposalError(proposal.error).key === 'notFound';
    return (
      <EmptyState
        illustration="search"
        title={notFound ? t('errors.notFound') : common('loadError')}
        action={
          <Link
            href="/app/distribution"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t('detail.back')}
          </Link>
        }
      />
    );
  }
  return <Detail proposal={proposal.data} />;
}
