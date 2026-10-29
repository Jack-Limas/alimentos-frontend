'use client';

import { useTranslations } from 'next-intl';
import { FreshnessBar } from '@/components/inventory/freshness-bar';
import { Quantity } from '@/components/inventory/quantity';
import { CategoryTile, StockChip, WasteChip } from '@/components/inventory/status-chips';
import type { Product } from '@/features/products/types';
import { Link } from '@/i18n/navigation';

const edge = {
  OK: 'before:bg-brand-400',
  LOW: 'before:bg-expiry-400',
  OUT: 'before:bg-critical-500',
} as const;

/** Phone list: big tap targets, the stock status as a colored edge plus a chip. */
export function ProductCards({ products }: { products: Product[] }) {
  const t = useTranslations('Products');
  const catalog = useTranslations('Catalog');

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/app/products/${product.id}`}
            aria-label={t('openDetail', { name: product.name })}
            className={`relative block overflow-hidden rounded-card bg-surface p-4 pl-5 shadow-card ring-1 ring-border transition before:absolute before:inset-y-0 before:left-0 before:w-1.5 active:scale-[0.98] motion-reduce:active:scale-100 ${edge[product.stockStatus]}`}
          >
            <div className="flex items-start gap-3">
              <CategoryTile category={product.category} name={product.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.name}</p>
                <p className="text-xs text-muted">
                  {catalog(`categories.${product.category}`)}
                  {product.status === 'INACTIVE' ? ` · ${t('inactive')}` : ''}
                </p>
              </div>
              <p className="text-right font-display text-lg font-semibold leading-tight">
                <Quantity value={product.availableQty} unit={product.unit} />
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StockChip status={product.stockStatus} />
              <WasteChip risk={product.wasteRisk} short />
            </div>
            <div className="mt-3">
              <FreshnessBar daysLeft={product.daysToNearestExpiry} size="sm" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
