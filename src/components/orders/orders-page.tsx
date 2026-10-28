'use client';

import { useTranslations } from 'next-intl';
import { Button, buttonClass } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClass, selectClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { CUSTOMERS_ROLES, ORDER_CREATE_ROLES } from '@/features/app-shell/navigation';
import { hasRole } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { useCustomers } from '@/features/customers/api';
import { useOrders } from '@/features/orders/api';
import {
  hasActiveOrderFilters,
  OPEN_STATUSES,
  ORDERS_PAGE_SIZE,
  toggleStatus,
  toOrdersApiQuery,
  withOrderFilter,
  type OrderFilters,
} from '@/features/orders/filters';
import { ORDER_PRIORITIES, ORDER_STATUSES, type OrderPriority } from '@/features/orders/types';
import { useOrderFilters } from '@/features/orders/use-order-filters';
import { Link } from '@/i18n/navigation';
import { OrderCard } from './order-card';

function Filters({
  filters,
  onChange,
  canFilterCustomer,
}: {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  canFilterCustomer: boolean;
}) {
  const t = useTranslations('Orders.filters');
  const meta = useTranslations('OrderMeta');
  const common = useTranslations('Common');
  // GET /customers is ADMIN only: an operator filters by status, priority and date.
  const customers = useCustomers('status=ACTIVE&pageSize=100', canFilterCustomer);
  const openOnly =
    filters.statuses.length === OPEN_STATUSES.length &&
    OPEN_STATUSES.every((status) => filters.statuses.includes(status));

  return (
    <section
      aria-label={t('label')}
      className="space-y-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:p-5"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t('status')}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={openOnly}
            onClick={() => onChange(withOrderFilter(filters, { statuses: [...OPEN_STATUSES] }))}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 ${
              openOnly
                ? 'bg-forest-800 text-forest-50 ring-forest-800 dark:bg-forest-600'
                : 'bg-surface text-muted ring-border hover:text-foreground'
            }`}
          >
            {t('statusGroups.open')}
          </button>
          {ORDER_STATUSES.map((status) => {
            const pressed = filters.statuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                aria-pressed={pressed}
                onClick={() => onChange(toggleStatus(filters, status))}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 ${
                  pressed
                    ? 'bg-expiry-300 text-forest-950 ring-expiry-400 shadow-[0_2px_0_0_var(--color-expiry-600)]'
                    : 'bg-surface text-muted ring-border hover:text-foreground'
                }`}
              >
                {meta(`status.${status}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={`grid gap-3 ${canFilterCustomer ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <label className="text-sm font-semibold">
          {t('priority')}
          <select
            value={filters.priority ?? ''}
            onChange={(event) =>
              onChange(
                withOrderFilter(filters, {
                  priority: (event.target.value || undefined) as OrderPriority | undefined,
                }),
              )
            }
            className={`${selectClass} mt-1.5`}
          >
            <option value="">{t('anyPriority')}</option>
            {[...ORDER_PRIORITIES].reverse().map((priority) => (
              <option key={priority} value={priority}>
                {meta(`priority.${priority}`)}
              </option>
            ))}
          </select>
        </label>
        {canFilterCustomer ? (
          <label className="text-sm font-semibold">
            {t('customer')}
            <select
              value={filters.customerId ?? ''}
              onChange={(event) =>
                onChange(withOrderFilter(filters, { customerId: event.target.value || undefined }))
              }
              className={`${selectClass} mt-1.5`}
            >
              <option value="">{t('anyCustomer')}</option>
              {customers.data?.data.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="text-sm font-semibold">
          {t('dueBefore')}
          <input
            type="date"
            value={filters.dueBefore ?? ''}
            onChange={(event) =>
              onChange(withOrderFilter(filters, { dueBefore: event.target.value || undefined }))
            }
            className={`${inputClass} mt-1.5`}
          />
        </label>
      </div>

      {hasActiveOrderFilters(filters) ? (
        <button
          type="button"
          onClick={() => onChange({ statuses: [], page: 1 })}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {common('clearFilters')}
        </button>
      ) : null}
    </section>
  );
}

export function OrdersPage() {
  const t = useTranslations('Orders');
  const common = useTranslations('Common');
  const { user } = useAuth();
  const { filters, setFilters } = useOrderFilters();
  const orders = useOrders(toOrdersApiQuery(filters));
  const canCreate = hasRole(user, ORDER_CREATE_ROLES);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        {canCreate ? (
          <Link href="/app/orders/new" className={buttonClass('primary')}>
            <Icon name="plus" />
            {t('newOrder')}
          </Link>
        ) : null}
      </header>

      <Filters
        filters={filters}
        onChange={setFilters}
        canFilterCustomer={hasRole(user, CUSTOMERS_ROLES)}
      />

      {orders.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-card" />
          ))}
        </div>
      ) : orders.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void orders.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : orders.data.data.length === 0 ? (
        <EmptyState
          illustration="ledger"
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            hasActiveOrderFilters(filters) ? (
              <Button variant="secondary" onClick={() => setFilters({ statuses: [], page: 1 })}>
                {common('clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={`space-y-4 transition-opacity ${orders.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orders.data.data.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </ul>
          <Pagination
            page={orders.data.meta.page}
            pageSize={ORDERS_PAGE_SIZE}
            total={orders.data.meta.total}
            onPageChange={(page) => setFilters(withOrderFilter(filters, { page }))}
          />
        </div>
      )}
    </div>
  );
}
