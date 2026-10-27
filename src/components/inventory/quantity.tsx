'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { Unit } from '@/features/inventory/types';

/** Formats a quantity as text: locale number format plus the translated unit ("12,5 kg"). */
export function useFormatQuantity(): (value: number, unit: Unit) => string {
  const format = useFormatter();
  const t = useTranslations('Catalog.units.short');
  return (value, unit) => `${format.number(value, { maximumFractionDigits: 3 })} ${t(unit)}`;
}

/** A quantity in the locale's number format followed by its translated unit. */
export function Quantity({ value, unit }: { value: number; unit: Unit }) {
  const formatQuantity = useFormatQuantity();
  return <span className="whitespace-nowrap tabular-nums">{formatQuantity(value, unit)}</span>;
}
