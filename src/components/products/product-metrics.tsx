'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Quantity, useFormatQuantity } from '@/components/inventory/quantity';
import type { ProductDetail } from '@/features/products/types';

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-border">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-2 font-display text-2xl font-semibold">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{hint}</dd>
    </div>
  );
}

const availableAccent = {
  OK: 'bg-brand-400',
  LOW: 'bg-expiry-400',
  OUT: 'bg-critical-500',
} as const;

export function ProductMetrics({ product }: { product: ProductDetail }) {
  const t = useTranslations('ProductDetail.metrics');
  const formatQuantity = useFormatQuantity();

  return (
    <dl aria-label={t('label')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label={t('available')}
        value={<Quantity value={product.availableQty} unit={product.unit} />}
        hint={t('availableHint', { quantity: formatQuantity(product.minStock, product.unit) })}
        accent={availableAccent[product.stockStatus]}
      />
      <Tile
        label={t('coverage')}
        value={
          product.coverageDays === null
            ? t('coverageNone')
            : t('coverageValue', { days: product.coverageDays })
        }
        hint={t('coverageHint')}
        accent={product.wasteRisk === 'HIGH' ? 'bg-berry-500' : 'bg-lagoon-400'}
      />
      <Tile
        label={t('outflow')}
        value={<Quantity value={product.avgDailyOut30d} unit={product.unit} />}
        hint={t('outflowHint')}
        accent="bg-forest-500"
      />
      <Tile
        label={t('expired')}
        value={<Quantity value={product.expiredQty} unit={product.unit} />}
        hint={t('expiredHint')}
        accent={product.expiredQty > 0 ? 'bg-sand-400' : 'bg-sand-200 dark:bg-sand-700'}
      />
    </dl>
  );
}
