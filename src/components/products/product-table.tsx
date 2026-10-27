'use client';

import { useTranslations } from 'next-intl';
import { FreshnessBar } from '@/components/inventory/freshness-bar';
import { Quantity, useFormatQuantity } from '@/components/inventory/quantity';
import { CategoryTile, StockChip, WasteChip } from '@/components/inventory/status-chips';
import type { Product } from '@/features/products/types';
import { Link } from '@/i18n/navigation';

/** Desktop list: one row per product, the whole row name links to the detail. */
export function ProductTable({ products }: { products: Product[] }) {
  const t = useTranslations('Products');
  const catalog = useTranslations('Catalog');
  const formatQuantity = useFormatQuantity();

  return (
    <div className="hidden overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-border lg:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              {t('table.product')}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              {t('table.available')}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t('table.stock')}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              {t('table.waste')}
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              {t('table.freshness')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr
              key={product.id}
              className="transition-colors hover:bg-forest-50/60 dark:hover:bg-forest-950/40"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <CategoryTile category={product.category} name={product.name} />
                  <div className="min-w-0">
                    <Link
                      href={`/app/products/${product.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {catalog(`categories.${product.category}`)}
                      {product.status === 'INACTIVE' ? ` · ${t('inactive')}` : ''}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right">
                <p className="font-semibold">
                  <Quantity value={product.availableQty} unit={product.unit} />
                </p>
                <p className="text-xs text-muted">
                  {t('table.minimum', {
                    quantity: formatQuantity(product.minStock, product.unit),
                  })}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <StockChip status={product.stockStatus} />
              </td>
              <td className="px-4 py-3.5">
                <WasteChip risk={product.wasteRisk} short />
              </td>
              <td className="px-5 py-3.5">
                <FreshnessBar daysLeft={product.daysToNearestExpiry} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
