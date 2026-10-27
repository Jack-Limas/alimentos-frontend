'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { inputClass, selectClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import {
  EXPIRING_OPTIONS,
  hasActiveFilters,
  withFilter,
  type ProductFilters,
  type StockFilter,
} from '@/features/products/filters';
import {
  CATEGORIES,
  PRODUCT_STATUSES,
  type Category,
  type ProductStatus,
} from '@/features/products/types';

const SEARCH_DEBOUNCE_MS = 300;
const STOCK_OPTIONS: readonly (StockFilter | 'ALL')[] = ['ALL', 'LOW', 'OUT'];

interface ProductFiltersBarProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}

export function ProductFiltersBar({ filters, onChange }: ProductFiltersBarProps) {
  const t = useTranslations('Products.filters');
  const catalog = useTranslations('Catalog');
  const common = useTranslations('Common');
  const [search, setSearch] = useState(filters.search ?? '');

  // Debounce: the URL (and the request) follows the box 300 ms after typing stops.
  useEffect(() => {
    if (search.trim() === (filters.search ?? '')) return;
    const timer = window.setTimeout(() => {
      onChange(withFilter(filters, { search: search.trim() || undefined }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search, filters, onChange]);

  const stock = filters.stockStatus ?? 'ALL';

  return (
    <section
      aria-label={t('label')}
      className="rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:p-5"
    >
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="product-search" className="sr-only">
            {t('search')}
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
          />
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
            className={`${inputClass} pl-10`}
          />
        </div>

        <div>
          <label htmlFor="product-category" className="sr-only">
            {t('category')}
          </label>
          <select
            id="product-category"
            value={filters.category ?? ''}
            onChange={(event) =>
              onChange(
                withFilter(filters, {
                  category: (event.target.value || undefined) as Category | undefined,
                }),
              )
            }
            className={selectClass}
          >
            <option value="">{t('allCategories')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {catalog(`categories.${category}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-expiring" className="sr-only">
            {t('expiring')}
          </label>
          <select
            id="product-expiring"
            value={
              filters.expiringWithinDays === undefined ? '' : String(filters.expiringWithinDays)
            }
            onChange={(event) =>
              onChange(
                withFilter(filters, {
                  expiringWithinDays:
                    event.target.value === '' ? undefined : Number(event.target.value),
                }),
              )
            }
            className={selectClass}
          >
            <option value="">
              {t('expiring')}: {t('anyExpiry')}
            </option>
            {/* Keep a value from the URL that is not one of the presets selectable. */}
            {[
              ...new Set([
                ...EXPIRING_OPTIONS,
                ...(filters.expiringWithinDays === undefined ? [] : [filters.expiringWithinDays]),
              ]),
            ]
              .sort((a, b) => a - b)
              .map((days) => (
                <option key={days} value={days}>
                  {t('expiring')} {t('withinDays', { days })}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-status" className="sr-only">
            {t('status')}
          </label>
          <select
            id="product-status"
            value={filters.status ?? ''}
            onChange={(event) =>
              onChange(
                withFilter(filters, {
                  status: (event.target.value || undefined) as ProductStatus | undefined,
                }),
              )
            }
            className={selectClass}
          >
            <option value="">{t('allStatuses')}</option>
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {catalog(`productStatus.${status}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <fieldset className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
          <legend className="sr-only">{t('stock')}</legend>
          {STOCK_OPTIONS.map((option) => {
            const checked = stock === option;
            const label = option === 'ALL' ? t('allStock') : option === 'LOW' ? t('low') : t('out');
            return (
              <label
                key={option}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring active:scale-95 motion-reduce:active:scale-100 ${
                  checked
                    ? option === 'OUT'
                      ? 'bg-critical-600 text-white'
                      : option === 'LOW'
                        ? 'bg-expiry-300 text-forest-950'
                        : 'bg-forest-800 text-forest-50 dark:bg-forest-600'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="stock-status"
                  value={option}
                  checked={checked}
                  onChange={() =>
                    onChange(
                      withFilter(filters, { stockStatus: option === 'ALL' ? undefined : option }),
                    )
                  }
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </fieldset>

        {filters.wasteRisk ? (
          <button
            type="button"
            onClick={() => onChange(withFilter(filters, { wasteRisk: undefined }))}
            aria-label={t('removeFilter', { filter: t('wasteHigh') })}
            className="inline-flex items-center gap-2 rounded-full bg-berry-100 px-3 py-1.5 text-sm font-semibold text-berry-800 ring-1 ring-berry-200 transition active:scale-95 motion-reduce:active:scale-100 dark:bg-berry-900/40 dark:text-berry-200 dark:ring-berry-800"
          >
            {t('wasteHigh')} <span aria-hidden="true">✕</span>
          </button>
        ) : null}

        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              onChange({ page: 1 });
            }}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {common('clearFilters')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
