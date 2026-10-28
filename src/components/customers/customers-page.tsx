'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { gradientFor } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { inputClass } from '@/components/ui/field';
import { Icon, type IconName } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { initialsOf } from '@/components/layout/initials';
import { useCustomers, useUpdateCustomer } from '@/features/customers/api';
import { CUSTOMER_TYPES, type Customer, type CustomerType } from '@/features/customers/types';
import { CustomerFormModal } from './customer-form-modal';

const SEARCH_DEBOUNCE_MS = 300;

const typeIcon: Record<CustomerType, IconName> = {
  SUPERMARKET: 'boxes',
  RESTAURANT: 'flame',
  SCHOOL: 'flag',
  HOSPITAL: 'plus',
  FOOD_BANK: 'leaf',
};

function CustomerCard({
  customer,
  onEdit,
  index,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  index: number;
}) {
  const t = useTranslations('Customers');
  const meta = useTranslations('OrderMeta.customerTypes');
  const toast = useToast();
  const update = useUpdateCustomer();
  const active = customer.status === 'ACTIVE';

  async function toggle() {
    const saved = await update.mutateAsync({
      id: customer.id,
      patch: { status: active ? 'INACTIVE' : 'ACTIVE' },
    });
    toast.show(
      active ? t('deactivated', { name: saved.name }) : t('activated', { name: saved.name }),
    );
  }

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className={`flex flex-col rounded-card bg-surface p-5 shadow-card ring-1 ring-border motion-safe:animate-rise-in ${active ? '' : 'opacity-70'}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-semibold text-white ${gradientFor(customer.name)}`}
        >
          {initialsOf(customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{customer.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Icon name={typeIcon[customer.type]} className="size-3.5" />
            {meta(customer.type)}
            {active ? null : (
              <span className="rounded-full bg-sand-200 px-2 py-0.5 text-sand-800 dark:bg-sand-700 dark:text-sand-100">
                {t('inactive')}
              </span>
            )}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li className="flex items-start gap-2">
          <Icon name="pin" className="mt-0.5 size-4 text-muted" />
          <span>{customer.address}</span>
        </li>
        <li className="flex items-center gap-2 text-muted">
          <Icon name="phone" className="size-4" />
          {customer.phone ?? t('noPhone')}
        </li>
        <li className="flex items-center gap-2 truncate text-muted">
          <Icon name="mail" className="size-4" />
          {customer.email ?? t('noEmail')}
        </li>
      </ul>
      <div className="mt-auto flex gap-2 pt-4">
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon name="pencil" className="size-4" />}
          onClick={() => onEdit(customer)}
        >
          {t('edit')}
        </Button>
        <Button
          variant={active ? 'ghost' : 'lagoon'}
          size="sm"
          disabled={update.isPending}
          onClick={() => void toggle()}
          className="ml-auto"
        >
          {active ? t('deactivate') : t('activate')}
        </Button>
      </div>
    </li>
  );
}

export function CustomersPage() {
  const t = useTranslations('Customers');
  const meta = useTranslations('OrderMeta.customerTypes');
  const common = useTranslations('Common');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState<CustomerType | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ pageSize: '100' });
  if (debounced) params.set('search', debounced);
  if (type) params.set('type', type);
  if (!showInactive) params.set('status', 'ACTIVE');
  const customers = useCustomers(params.toString());

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-berry-700 dark:text-berry-300">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
          {t('newCustomer')}
        </Button>
      </header>

      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:p-5">
        <div className="relative">
          <label htmlFor="customer-search" className="sr-only">
            {t('search')}
          </label>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
          />
          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['', ...CUSTOMER_TYPES] as const).map((value) => {
            const pressed = type === value;
            return (
              <button
                key={value || 'all'}
                type="button"
                aria-pressed={pressed}
                onClick={() => setType(value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 ${
                  pressed
                    ? 'bg-berry-600 text-white ring-berry-700 shadow-[0_2px_0_0_var(--color-berry-800)]'
                    : 'bg-surface text-muted ring-border hover:text-foreground'
                }`}
              >
                {value ? meta(value) : t('allTypes')}
              </button>
            );
          })}
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="size-4 accent-[var(--color-forest-600)]"
            />
            {t('showInactive')}
          </label>
        </div>
      </section>

      {customers.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-card" />
          ))}
        </div>
      ) : customers.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void customers.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : customers.data.data.length === 0 ? (
        <EmptyState
          illustration="search"
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <ul
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${customers.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {customers.data.data.map((customer, index) => (
            <CustomerCard key={customer.id} customer={customer} onEdit={setEditing} index={index} />
          ))}
        </ul>
      )}

      <CustomerFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        customer={editing === 'new' || editing === null ? undefined : editing}
      />
    </div>
  );
}
