'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useFormatQuantity } from '@/components/inventory/quantity';
import { MovementChip } from '@/components/inventory/status-chips';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClass, selectClass } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useMovements } from '@/features/inventory/api';
import {
  MOVEMENTS_PAGE_SIZE,
  toMovementsApiQuery,
  type MovementFilters,
} from '@/features/inventory/movement-filters';
import { MOVEMENT_TYPES, type Movement, type MovementType } from '@/features/inventory/types';
import { useMovementFilters } from '@/features/inventory/use-movement-filters';
import { useProductIndex, type ProductIndexEntry } from '@/features/products/api';
import { Link } from '@/i18n/navigation';

/** Exits are shown with a minus sign; the API always sends a positive quantity. */
const OUTGOING: ReadonlySet<MovementType> = new Set(['EXIT_DISPATCH', 'EXIT_WASTE', 'ADJUSTMENT']);

function Filters({
  filters,
  onChange,
}: {
  filters: MovementFilters;
  onChange: (filters: MovementFilters) => void;
}) {
  const t = useTranslations('Movements.filters');
  const catalog = useTranslations('Catalog.movementTypes');
  const common = useTranslations('Common');
  const change = (patch: Partial<MovementFilters>) => {
    const next: MovementFilters = { ...filters, ...patch, page: 1 };
    for (const key of ['type', 'from', 'to'] as const) if (!next[key]) delete next[key];
    onChange(next);
  };

  return (
    <section
      aria-label={t('label')}
      className="grid gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:grid-cols-3 sm:p-5"
    >
      <label className="text-sm font-semibold">
        {t('type')}
        <select
          value={filters.type ?? ''}
          onChange={(event) => change({ type: (event.target.value || undefined) as MovementType })}
          className={`${selectClass} mt-1.5`}
        >
          <option value="">{t('allTypes')}</option>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {catalog(type)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        {t('from')}
        <input
          type="date"
          value={filters.from ?? ''}
          max={filters.to}
          onChange={(event) => change({ from: event.target.value || undefined })}
          className={`${inputClass} mt-1.5`}
        />
      </label>
      <label className="text-sm font-semibold">
        {t('to')}
        <input
          type="date"
          value={filters.to ?? ''}
          min={filters.from}
          onChange={(event) => change({ to: event.target.value || undefined })}
          className={`${inputClass} mt-1.5`}
        />
      </label>
      {filters.type || filters.from || filters.to ? (
        <button
          type="button"
          onClick={() => onChange({ page: 1 })}
          className="justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline sm:col-span-3"
        >
          {common('clearFilters')}
        </button>
      ) : null}
    </section>
  );
}

function useRow(index: Map<string, ProductIndexEntry> | undefined) {
  const t = useTranslations('Movements.table');
  const format = useFormatter();
  const formatQuantity = useFormatQuantity();
  return (movement: Movement) => {
    const product = index?.get(movement.productId);
    const sign = OUTGOING.has(movement.type) ? '−' : '+';
    return {
      date: format.dateTime(new Date(movement.createdAt), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      productName: product?.name ?? t('unknownProduct'),
      quantity: product
        ? `${sign}${formatQuantity(movement.quantity, product.unit)}`
        : `${sign}${format.number(movement.quantity)}`,
      outgoing: sign === '−',
      reason: movement.reason ?? t('noReason'),
    };
  };
}

export function MovementsPage() {
  const t = useTranslations('Movements');
  const common = useTranslations('Common');
  const { filters, setFilters } = useMovementFilters();
  const movements = useMovements(toMovementsApiQuery(filters));
  const index = useProductIndex();
  const row = useRow(index.data);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
      </header>

      <Filters filters={filters} onChange={setFilters} />

      {movements.isPending ? (
        <div aria-busy="true" className="space-y-2">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : movements.isError ? (
        <EmptyState
          illustration="ledger"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void movements.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : movements.data.data.length === 0 ? (
        <EmptyState
          illustration="ledger"
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div
          className={`space-y-4 transition-opacity ${movements.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <div className="hidden overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-border md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t('table.caption')}</caption>
              <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    {t('table.date')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('table.product')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t('table.type')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {t('table.quantity')}
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    {t('table.reason')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.data.data.map((movement) => {
                  const view = row(movement);
                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-lagoon-50/50 dark:hover:bg-lagoon-900/20"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{view.date}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/products/${movement.productId}`}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {view.productName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <MovementChip type={movement.type} />
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${view.outgoing ? 'text-critical-700 dark:text-critical-300' : 'text-brand-700 dark:text-brand-300'}`}
                      >
                        {view.quantity}
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-muted" title={view.reason}>
                        {view.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {movements.data.data.map((movement) => {
              const view = row(movement);
              return (
                <li
                  key={movement.id}
                  className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/app/products/${movement.productId}`}
                        className="block truncate font-semibold"
                      >
                        {view.productName}
                      </Link>
                      <p className="text-xs text-muted">{view.date}</p>
                    </div>
                    <p
                      className={`whitespace-nowrap font-display text-lg font-semibold tabular-nums ${view.outgoing ? 'text-critical-700 dark:text-critical-300' : 'text-brand-700 dark:text-brand-300'}`}
                    >
                      {view.quantity}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MovementChip type={movement.type} />
                    <p className="truncate text-xs text-muted">{view.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={movements.data.meta.page}
            pageSize={MOVEMENTS_PAGE_SIZE}
            total={movements.data.meta.total}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </div>
      )}
    </div>
  );
}
