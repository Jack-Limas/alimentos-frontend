'use client';

import { useTranslations } from 'next-intl';
import { Chip, type Tone } from '@/components/ui/chip';
import type { MovementType } from '@/features/inventory/types';
import type { Category, StockStatus, WasteRisk } from '@/features/products/types';

const stockTone: Record<StockStatus, Tone> = { OK: 'brand', LOW: 'expiry', OUT: 'critical' };
const wasteTone: Record<WasteRisk, Tone> = { NONE: 'sand', LOW: 'expiry', HIGH: 'berry' };

export const movementTone: Record<MovementType, Tone> = {
  ENTRY: 'brand',
  EXIT_DISPATCH: 'forest',
  EXIT_WASTE: 'berry',
  ADJUSTMENT: 'lagoon',
  RETURN: 'expiry',
};

export function StockChip({ status }: { status: StockStatus }) {
  const t = useTranslations('Catalog.stockStatus');
  return <Chip tone={stockTone[status]}>{t(status)}</Chip>;
}

export function WasteChip({ risk, short = false }: { risk: WasteRisk; short?: boolean }) {
  const t = useTranslations('Catalog');
  return (
    <Chip tone={wasteTone[risk]} title={t(`wasteRisk.${risk}`)}>
      {short ? t(`wasteRiskShort.${risk}`) : t(`wasteRisk.${risk}`)}
    </Chip>
  );
}

export function MovementChip({ type }: { type: MovementType }) {
  const t = useTranslations('Catalog.movementTypes');
  return <Chip tone={movementTone[type]}>{t(type)}</Chip>;
}

/** Each category gets its own tile color and initials, so lists are easy to scan. */
const categoryStyle: Record<Category, string> = {
  FRUITS_VEGETABLES: 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200',
  DAIRY: 'bg-lagoon-100 text-lagoon-800 dark:bg-lagoon-900/60 dark:text-lagoon-200',
  MEAT_POULTRY: 'bg-critical-100 text-critical-800 dark:bg-critical-900/50 dark:text-critical-200',
  FISH: 'bg-lagoon-200 text-lagoon-900 dark:bg-lagoon-800/70 dark:text-lagoon-100',
  BAKERY: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/50 dark:text-expiry-200',
  GRAINS_LEGUMES: 'bg-sand-200 text-sand-800 dark:bg-sand-800 dark:text-sand-100',
  CANNED: 'bg-forest-100 text-forest-800 dark:bg-forest-900/70 dark:text-forest-100',
  BEVERAGES: 'bg-berry-100 text-berry-800 dark:bg-berry-900/50 dark:text-berry-200',
  FROZEN: 'bg-lagoon-50 text-lagoon-700 dark:bg-lagoon-900/40 dark:text-lagoon-200',
  OTHER: 'bg-sand-100 text-sand-700 dark:bg-sand-800 dark:text-sand-200',
};

export function CategoryTile({ category, name }: { category: Category; name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl font-display text-base font-semibold ${categoryStyle[category]}`}
    >
      {initials}
    </span>
  );
}
