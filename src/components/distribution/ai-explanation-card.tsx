'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { segmentAiText, TIE_BREAK_PREVIEW, visibleTieBreak } from '@/features/distribution/ai-text';
import { useExplainProposal } from '@/features/distribution/api';
import {
  mapExplanationError,
  type ExplanationErrorKey,
} from '@/features/distribution/proposal-errors';
import type { AiInsight } from '@/features/distribution/types';
import { Link } from '@/i18n/navigation';

/** Plain AI text, formatted here: order codes become links to the order. */
function AiText({ text, orderIds }: { text: string; orderIds: ReadonlyMap<string, string> }) {
  return (
    <>
      {segmentAiText(text).map((segment, index) => {
        if (segment.type === 'text') return <span key={index}>{segment.value}</span>;
        const orderId = orderIds.get(segment.code);
        const chip =
          'mx-0.5 inline-flex rounded-md bg-forest-100 px-1.5 font-display text-[0.92em] font-semibold text-forest-800 dark:bg-forest-900/60 dark:text-forest-100';
        return orderId ? (
          <Link key={index} href={`/app/orders/${orderId}`} className={`${chip} hover:underline`}>
            {segment.code}
          </Link>
        ) : (
          <span key={index} className={chip}>
            {segment.code}
          </span>
        );
      })}
    </>
  );
}

/**
 * The AI explanation of a plan. It never breaks the page: 404, 503 and
 * network errors only show "AI not available for now".
 */
export function AiExplanationCard({
  proposalId,
  insight,
  orderIds,
}: {
  proposalId: string;
  insight: AiInsight | null;
  orderIds: ReadonlyMap<string, string>;
}) {
  const t = useTranslations('Distribution.explanation');
  const locale = useLocale() as 'es' | 'en';
  const explain = useExplainProposal(proposalId);
  const [failure, setFailure] = useState<ExplanationErrorKey | null>(null);
  const [cached, setCached] = useState(false);
  const [showAllTies, setShowAllTies] = useState(false);

  async function run(refresh: boolean) {
    setFailure(null);
    try {
      const response = await explain.mutateAsync({ locale, refresh });
      setCached(response.meta.cached);
    } catch (error) {
      setFailure(mapExplanationError(error));
    }
  }

  return (
    <section
      aria-labelledby="ai-title"
      className="relative overflow-hidden rounded-card bg-gradient-to-br from-berry-50 via-surface to-lagoon-50 p-5 shadow-card ring-1 ring-berry-100 dark:from-berry-900/40 dark:via-surface dark:to-lagoon-900/30 dark:ring-berry-900 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ai-title" className="flex items-center gap-2 font-display text-xl font-semibold">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-berry-600 text-white shadow-[0_3px_0_0_var(--color-berry-800)]">
              <Icon name="flame" className="size-5" />
            </span>
            {t('title')}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{t('intro')}</p>
        </div>
        <Button
          variant="berry"
          size="sm"
          disabled={explain.isPending}
          onClick={() => void run(insight !== null)}
        >
          {insight ? t('regenerate') : t('generate')}
        </Button>
      </div>

      <div aria-live="polite" className="mt-4">
        {explain.isPending ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-berry-700 dark:text-berry-300">
            <span className="size-2 rounded-full bg-berry-500 motion-safe:animate-pulse" />
            {t('loading')}
          </p>
        ) : failure ? (
          <p
            role="status"
            className="rounded-2xl bg-surface/80 px-4 py-3 text-sm font-semibold text-muted ring-1 ring-border"
          >
            {t(failure)}
          </p>
        ) : null}

        {insight && !explain.isPending ? (
          <div className="space-y-4">
            <p className="text-base leading-relaxed">
              <AiText text={insight.summary} orderIds={orderIds} />
            </p>
            {insight.highlights.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {t('highlights')}
                </h3>
                <ul className="mt-2 space-y-2">
                  {insight.highlights.map((highlight, index) => (
                    <li key={index} className="flex gap-2.5 text-sm leading-relaxed">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-lagoon-500"
                      />
                      <span>
                        <AiText text={highlight} orderIds={orderIds} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {insight.tieBreakOrder && insight.tieBreakOrder.length > 0 ? (
              <p className="text-sm">
                <span className="font-semibold">{t('tieBreak')}: </span>
                <AiText
                  text={visibleTieBreak(insight.tieBreakOrder, showAllTies).join(' → ')}
                  orderIds={orderIds}
                />
                {insight.tieBreakOrder.length > TIE_BREAK_PREVIEW ? (
                  <button
                    type="button"
                    aria-expanded={showAllTies}
                    onClick={() => setShowAllTies((value) => !value)}
                    className="ml-2 font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {showAllTies
                      ? t('showFewer')
                      : t('showAll', { count: insight.tieBreakOrder.length })}
                  </button>
                ) : null}
              </p>
            ) : null}
            <p className="flex flex-wrap gap-2 text-xs text-muted">
              <span>{t('meta', { model: insight.model, ms: insight.latencyMs })}</span>
              {cached ? (
                <span className="rounded-full bg-surface px-2 ring-1 ring-border">
                  {t('cached')}
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
