'use client';

import { useTranslations } from 'next-intl';
import { reasonMessage } from '@/features/inventory/reasons';
import type { Reason, Unit } from '@/features/inventory/types';

const accent: Record<string, string> = {
  OUT_OF_STOCK: 'bg-critical-500',
  BELOW_MIN_STOCK: 'bg-expiry-400',
  EXPIRES_IN_DAYS: 'bg-expiry-500',
  EXPIRED_STOCK: 'bg-sand-400',
  NO_RECENT_OUTFLOW: 'bg-berry-500',
  COVERAGE_EXCEEDS_EXPIRY: 'bg-berry-500',
};

/** Server reasons (code + params) as translated sentences. No server text is shown. */
export function ReasonList({ reasons, unit }: { reasons: Reason[]; unit: Unit }) {
  const t = useTranslations('Reasons');
  const units = useTranslations('Catalog.units.short');

  return (
    <ul className="space-y-2.5">
      {reasons.map((reason, index) => {
        const { key, values } = reasonMessage(reason, units(unit));
        return (
          <li
            key={`${reason.code}-${index}`}
            className="flex gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${accent[reason.code] ?? 'bg-lagoon-500'}`}
            />
            <span>{t(key, values)}</span>
          </li>
        );
      })}
    </ul>
  );
}
