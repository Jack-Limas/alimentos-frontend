'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { useCreateProposal } from '@/features/distribution/api';
import type { Weights } from '@/features/distribution/engine';
import { mapProposalError, type ProposalErrorView } from '@/features/distribution/proposal-errors';
import { PROPOSAL_STRATEGIES, type ProposalInput } from '@/features/distribution/types';
import { presetOf } from '@/features/distribution/weights';
import { useRouter } from '@/i18n/navigation';

type Choice = (typeof PROPOSAL_STRATEGIES)[number] | 'CUSTOM';

/** What is sent: a strategy, and weights only when they are custom. Never figures. */
export function proposalInputOf(
  choice: Choice,
  weights: Weights,
  locale: 'es' | 'en',
): ProposalInput {
  return choice === 'CUSTOM'
    ? { strategy: 'BALANCED', weights, locale }
    : { strategy: choice, locale };
}

export function GenerateProposal({ weights }: { weights: Weights }) {
  const t = useTranslations('Distribution');
  const locale = useLocale() as 'es' | 'en';
  const router = useRouter();
  const toast = useToast();
  const create = useCreateProposal();
  const custom = presetOf(weights) === null;
  const [choice, setChoice] = useState<Choice>('BALANCED');
  const [failure, setFailure] = useState<ProposalErrorView | null>(null);
  const options: Choice[] = [...PROPOSAL_STRATEGIES, ...(custom ? ['CUSTOM' as const] : [])];
  const selected = options.includes(choice) ? choice : 'BALANCED';

  async function submit() {
    setFailure(null);
    try {
      const proposal = await create.mutateAsync(proposalInputOf(selected, weights, locale));
      toast.show(t('generate.created'));
      router.push(`/app/distribution/${proposal.id}`);
    } catch (error) {
      setFailure(mapProposalError(error));
    }
  }

  return (
    <section
      aria-labelledby="generate-title"
      className="rounded-card bg-gradient-to-br from-forest-50 to-lagoon-50 p-5 shadow-card ring-1 ring-forest-100 dark:from-forest-950/70 dark:to-lagoon-900/30 dark:ring-forest-800 sm:p-6"
    >
      <h2 id="generate-title" className="font-display text-xl font-semibold">
        {t('generate.title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('generate.intro')}</p>

      <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{t('generate.strategyLabel')}</legend>
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 transition ${
              selected === option
                ? 'bg-surface ring-2 ring-forest-600 dark:ring-forest-400'
                : 'bg-surface/60 ring-border hover:bg-surface'
            }`}
          >
            <input
              type="radio"
              name="proposal-strategy"
              value={option}
              checked={selected === option}
              onChange={() => setChoice(option)}
              className="mt-1 accent-[var(--color-forest-600)]"
            />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                {option === 'AI_ASSISTED' ? (
                  <Icon name="flame" className="size-4 text-berry-600 dark:text-berry-300" />
                ) : null}
                {option === 'CUSTOM'
                  ? t('generate.useCustom', {
                      priority: weights.priority,
                      deadline: weights.deadlineUrgency,
                      expiry: weights.expiryPressure,
                    })
                  : t(`strategies.${option}`)}
              </span>
              <span className="block text-xs text-muted">{t(`strategyHints.${option}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {failure ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-critical-50 px-4 py-3 text-sm font-semibold text-critical-800 ring-1 ring-critical-200 dark:bg-critical-900/30 dark:text-critical-200 dark:ring-critical-800"
        >
          {t(`errors.${failure.key}`)}
        </p>
      ) : null}

      <Button
        className="mt-5 w-full sm:w-auto"
        size="lg"
        icon={<Icon name="truck" />}
        disabled={create.isPending}
        onClick={() => void submit()}
      >
        {create.isPending ? t('generate.submitting') : t('generate.submit')}
      </Button>
    </section>
  );
}
