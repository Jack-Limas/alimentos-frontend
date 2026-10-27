'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { EntryModal } from '@/components/inventory/entry-modal';
import { ExitModal } from '@/components/inventory/exit-modal';
import { ReasonList } from '@/components/inventory/reason-list';
import { CategoryTile, StockChip, WasteChip } from '@/components/inventory/status-chips';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { hasRole } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { useProduct } from '@/features/products/api';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { LotList } from './lot-list';
import { ProductFormModal } from './product-form-modal';
import { ProductMetrics } from './product-metrics';

type Dialog = 'edit' | 'entry' | 'exit' | null;

export function ProductDetailPage({ id }: { id: string }) {
  const t = useTranslations('ProductDetail');
  const catalog = useTranslations('Catalog');
  const common = useTranslations('Common');
  const { user } = useAuth();
  const product = useProduct(id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const isAdmin = hasRole(user, ['ADMIN']);
  const close = () => setDialog(null);

  const back = (
    <Link
      href="/app/products"
      className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      ← {t('back')}
    </Link>
  );

  if (product.isPending) {
    return (
      <div aria-busy="true" className="space-y-5">
        <p role="status" className="sr-only">
          {t('loading')}
        </p>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-28 rounded-card" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }

  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="space-y-5">
        {back}
        <EmptyState
          illustration="search"
          title={notFound ? t('notFound.title') : common('loadError')}
          description={notFound ? t('notFound.description') : undefined}
          action={
            notFound ? undefined : (
              <Button variant="secondary" onClick={() => void product.refetch()}>
                {common('retry')}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const data = product.data;

  return (
    <div className="space-y-6">
      {back}

      <header className="relative overflow-hidden rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-lagoon-200/50 blur-3xl dark:bg-lagoon-800/25"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <CategoryTile category={data.category} name={data.name} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {catalog(`categories.${data.category}`)}
              </p>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {data.name}
              </h1>
            </div>
          </div>
          {isAdmin ? (
            <div
              role="group"
              aria-label={t('actions.label')}
              className="flex w-full flex-wrap gap-2 sm:w-auto"
            >
              <Button
                variant="secondary"
                size="sm"
                icon={<Icon name="pencil" className="size-4" />}
                onClick={() => setDialog('edit')}
              >
                {t('actions.edit')}
              </Button>
              <Button
                size="sm"
                icon={<Icon name="in" className="size-4" />}
                onClick={() => setDialog('entry')}
              >
                {t('actions.entry')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Icon name="out" className="size-4" />}
                onClick={() => setDialog('exit')}
              >
                {t('actions.exit')}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <StockChip status={data.stockStatus} />
          <WasteChip risk={data.wasteRisk} />
          {data.status === 'INACTIVE' ? (
            <Chip tone="sand">{catalog('productStatus.INACTIVE')}</Chip>
          ) : null}
        </div>
      </header>

      <ProductMetrics product={data} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <section aria-labelledby="reasons-title">
          <h2 id="reasons-title" className="font-display text-lg font-semibold">
            {t('reasons.title')}
          </h2>
          <div className="mt-3">
            {data.reasons.length === 0 ? (
              <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800">
                {t('reasons.none')}
              </p>
            ) : (
              <ReasonList reasons={data.reasons} unit={data.unit} />
            )}
          </div>
        </section>

        <section aria-labelledby="lots-title">
          <h2 id="lots-title" className="font-display text-lg font-semibold">
            {t('lots.title')}
          </h2>
          <p className="text-sm text-muted">{t('lots.subtitle')}</p>
          <div className="mt-3">
            <LotList lots={data.lots} unit={data.unit} />
          </div>
        </section>
      </div>

      {isAdmin ? (
        <>
          <ProductFormModal open={dialog === 'edit'} onClose={close} product={data} />
          <EntryModal open={dialog === 'entry'} onClose={close} product={data} />
          <ExitModal open={dialog === 'exit'} onClose={close} product={data} />
        </>
      ) : null}
    </div>
  );
}
