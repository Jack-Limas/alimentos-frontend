'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { PROPOSALS_PAGE_SIZE, useProposals } from '@/features/distribution/api';
import type { ProposalStatus } from '@/features/distribution/types';
import { Link } from '@/i18n/navigation';
import { BUSINESS_TIME_ZONE } from '@/lib/dates';

export const proposalStatusTone: Record<ProposalStatus, 'expiry' | 'brand' | 'sand'> = {
  DRAFT: 'expiry',
  CONFIRMED: 'brand',
  DISCARDED: 'sand',
};

export function ProposalHistory() {
  const t = useTranslations('Distribution');
  const common = useTranslations('Common');
  const format = useFormatter();
  const [page, setPage] = useState(1);
  const proposals = useProposals(page);

  return (
    <section
      aria-labelledby="history-title"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
    >
      <h2 id="history-title" className="font-display text-xl font-semibold">
        {t('history.title')}
      </h2>
      {proposals.isPending ? (
        <Skeleton className="mt-4 h-40 rounded-2xl" />
      ) : proposals.isError ? (
        <p className="mt-4 text-sm text-muted">{common('loadError')}</p>
      ) : proposals.data.data.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t('history.empty')}</p>
      ) : (
        <>
          <ul
            className={`mt-4 divide-y divide-border ${proposals.isPlaceholderData ? 'opacity-60' : ''}`}
          >
            {proposals.data.data.map((proposal) => (
              <li key={proposal.id}>
                <Link
                  href={`/app/distribution/${proposal.id}`}
                  aria-label={`${t('history.open')}: ${t(`strategies.${proposal.strategy}`)}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 transition hover:bg-surface-muted"
                >
                  <span className="font-semibold">{t(`strategies.${proposal.strategy}`)}</span>
                  <Chip tone={proposalStatusTone[proposal.status]}>
                    {t(`status.${proposal.status}`)}
                  </Chip>
                  {proposal.degraded ? <Chip tone="berry">{t('history.degraded')}</Chip> : null}
                  <span className="text-sm text-muted">
                    {t('history.orders', {
                      full: proposal.summary.ordersFull,
                      partial: proposal.summary.ordersPartial,
                      unserved: proposal.summary.ordersUnserved,
                    })}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted">
                    {t('history.createdAt', {
                      date: format.dateTime(new Date(proposal.createdAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: BUSINESS_TIME_ZONE,
                      }),
                    })}
                    <Icon name="chevron" className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Pagination
              page={page}
              pageSize={PROPOSALS_PAGE_SIZE}
              total={proposals.data.meta.total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
}
