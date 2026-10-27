'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { hasRole } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { useProducts } from '@/features/products/api';
import { hasActiveFilters, PRODUCTS_PAGE_SIZE, withFilter } from '@/features/products/filters';
import { useProductFilters } from '@/features/products/use-product-filters';
import { ProductCards } from './product-cards';
import { ProductFiltersBar } from './product-filters-bar';
import { ProductFormModal } from './product-form-modal';
import { ProductTable } from './product-table';

export function ProductsPage() {
  const t = useTranslations('Products');
  const common = useTranslations('Common');
  const { user } = useAuth();
  const { filters, setFilters } = useProductFilters();
  const products = useProducts(filters);
  const [creating, setCreating] = useState(false);
  const isAdmin = hasRole(user, ['ADMIN']);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        {isAdmin ? (
          <Button icon={<Icon name="plus" />} onClick={() => setCreating(true)}>
            {t('newProduct')}
          </Button>
        ) : null}
      </header>

      <ProductFiltersBar filters={filters} onChange={setFilters} />

      {products.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-card" />
          ))}
        </div>
      ) : products.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void products.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : products.data.data.length === 0 ? (
        hasActiveFilters(filters) ? (
          <EmptyState
            illustration="search"
            title={t('noMatch.title')}
            description={t('noMatch.description')}
            action={
              <Button variant="secondary" onClick={() => setFilters({ page: 1 })}>
                {common('clearFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState title={t('empty.title')} description={t('empty.description')} />
        )
      ) : (
        <div
          className={`space-y-4 transition-opacity ${products.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <ProductTable products={products.data.data} />
          <ProductCards products={products.data.data} />
          <Pagination
            page={products.data.meta.page}
            pageSize={PRODUCTS_PAGE_SIZE}
            total={products.data.meta.total}
            onPageChange={(page) => setFilters(withFilter(filters, { page }))}
          />
        </div>
      )}

      {isAdmin ? <ProductFormModal open={creating} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
