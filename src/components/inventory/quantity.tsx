'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { Unit } from '@/features/inventory/types';

/** A quantity in the locale's number format followed by its translated unit. */
export function Quantity({ value, unit }: { value: number; unit: Unit }) {
  const format = useFormatter();
  const t = useTranslations('Catalog.units.short');
  return (
    <span className="whitespace-nowrap tabular-nums">
      {format.number(value, { maximumFractionDigits: 3 })} {t(unit)}
    </span>
  );
}
