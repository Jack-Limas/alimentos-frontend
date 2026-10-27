'use client';

import { useTranslations } from 'next-intl';
import type { MutationErrorView } from '@/features/inventory/mutation-errors';

/** Translated write error inside a form; announced to screen readers. */
export function MutationErrorBanner({ error, unit }: { error: MutationErrorView; unit?: string }) {
  const t = useTranslations('Forms.mutationErrors');

  const message =
    error.kind === 'insufficientStock'
      ? error.available === null
        ? t('insufficientStockUnknown')
        : t('insufficientStock', { available: error.available, unit: unit ?? '' })
      : t(error.kind);

  return (
    <p
      role="alert"
      className="rounded-2xl border border-critical-200 bg-critical-50 px-4 py-3 text-sm font-semibold text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200"
    >
      {message}
    </p>
  );
}
