'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { FreshnessBar } from '@/components/inventory/freshness-bar';
import { Quantity } from '@/components/inventory/quantity';
import type { Lot, Unit } from '@/features/inventory/types';
import { businessToday, calendarDateToUtc, daysBetween } from '@/lib/dates';

/** Days from the reception date (Bogota) to the expiry date: the life of the bar. */
function lifeDaysOf(lot: Lot): number {
  return daysBetween(businessToday(new Date(lot.receivedAt)), lot.expiryDate);
}

export function LotList({ lots, unit }: { lots: Lot[]; unit: Unit }) {
  const t = useTranslations('ProductDetail.lots');
  const format = useFormatter();
  const firstUsable = lots.find((lot) => !lot.expired)?.id;

  if (lots.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
        {t('empty')}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {lots.map((lot, index) => (
        <li
          key={lot.id}
          className={`relative rounded-2xl border bg-surface p-4 transition ${
            lot.expired
              ? 'border-dashed border-sand-300 dark:border-sand-700'
              : lot.id === firstUsable
                ? 'border-expiry-300 shadow-[0_0_0_3px_var(--color-expiry-100)] dark:border-expiry-600 dark:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-expiry-700)_35%,transparent)]'
                : 'border-border'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex size-8 items-center justify-center rounded-full bg-forest-900 text-xs font-bold text-forest-50 dark:bg-forest-700"
              >
                {t('order', { position: index + 1 })}
              </span>
              <div>
                <p className="font-semibold">{lot.lotCode ?? t('noCode')}</p>
                <p className="text-xs text-muted">
                  {t('received', {
                    date: format.dateTime(new Date(lot.receivedAt), { dateStyle: 'medium' }),
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {t.rich('quantity', {
                  quantity: () => <Quantity value={lot.quantity} unit={unit} />,
                  initial: () => <Quantity value={lot.initialQuantity} unit={unit} />,
                })}
              </p>
              <p className="text-xs text-muted">
                {t('expires', {
                  date: format.dateTime(calendarDateToUtc(lot.expiryDate), {
                    timeZone: 'UTC',
                    dateStyle: 'medium',
                  }),
                })}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <FreshnessBar daysLeft={lot.daysToExpiry} lifeDays={lifeDaysOf(lot)} />
            {lot.id === firstUsable ? (
              <span className="rounded-full bg-expiry-200 px-2.5 py-0.5 text-xs font-bold text-forest-950">
                {t('nextOut')}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
