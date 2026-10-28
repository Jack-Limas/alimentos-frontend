'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useFormatQuantity } from '@/components/inventory/quantity';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { useOrder } from '@/features/orders/api';
import type { OrderDetail } from '@/features/orders/types';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { calendarDateToUtc } from '@/lib/dates';
import { DueCountdown, OrderStatusChip, PriorityBadge } from './order-badges';
import { OrderActions } from './order-actions';
import { StatusStepper } from './status-stepper';

function Items({ order }: { order: OrderDetail }) {
  const t = useTranslations('OrderDetail.items');
  const formatQuantity = useFormatQuantity();

  return (
    <section
      aria-labelledby="items-title"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border"
    >
      <h2 id="items-title" className="font-display text-lg font-semibold">
        {t('title')}
      </h2>
      <ul className="mt-4 space-y-3">
        {order.items.map((item) => {
          const percent =
            item.requestedQty > 0
              ? Math.min(100, (item.allocatedQty / item.requestedQty) * 100)
              : 0;
          return (
            <li key={item.id} className="rounded-2xl bg-surface-muted/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/app/products/${item.productId}`}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  {item.productName}
                </Link>
                <span className="text-sm tabular-nums">
                  {t('progress', {
                    allocated: formatQuantity(item.allocatedQty, item.unit),
                    requested: formatQuantity(item.requestedQty, item.unit),
                  })}
                </span>
              </div>
              <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  style={{ width: `${percent}%` }}
                  className={`h-full rounded-full ${percent >= 100 ? 'bg-brand-500' : 'bg-expiry-400'}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function History({ order, userId }: { order: OrderDetail; userId: string }) {
  const t = useTranslations('OrderDetail.history');
  const status = useTranslations('OrderMeta.status');
  const format = useFormatter();

  return (
    <section
      aria-labelledby="history-title"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border"
    >
      <h2 id="history-title" className="font-display text-lg font-semibold">
        {t('title')}
      </h2>
      <ol className="relative mt-4 space-y-4 border-l-2 border-border pl-5">
        {order.history.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.72rem] top-1 size-3.5 rounded-full ring-4 ring-surface ${
                entry.toStatus === 'CANCELLED'
                  ? 'bg-critical-500'
                  : entry.toStatus === 'DELIVERED'
                    ? 'bg-brand-500'
                    : 'bg-lagoon-500'
              }`}
            />
            <p className="text-sm font-semibold">
              {entry.fromStatus === null
                ? t('created')
                : t('changed', { from: status(entry.fromStatus), to: status(entry.toStatus) })}
            </p>
            <p className="text-xs text-muted">
              {format.dateTime(new Date(entry.createdAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {entry.userId === userId ? ` · ${t('byYou')}` : ''}
            </p>
            {entry.note && !entry.note.startsWith('proposal:') ? (
              <p className="mt-1 text-xs italic text-muted">{t('note', { note: entry.note })}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OrderDetailPage({ id }: { id: string }) {
  const t = useTranslations('OrderDetail');
  const meta = useTranslations('OrderMeta');
  const common = useTranslations('Common');
  const format = useFormatter();
  const { user } = useAuth();
  const order = useOrder(id);

  const back = (
    <Link
      href="/app/orders"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      ← {t('back')}
    </Link>
  );

  if (order.isPending || user === null) {
    return (
      <div aria-busy="true" className="space-y-5">
        <p role="status" className="sr-only">
          {t('loading')}
        </p>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-56 rounded-card" />
      </div>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <div className="space-y-5">
        {back}
        <EmptyState
          illustration="search"
          title={notFound ? t('notFound.title') : common('loadError')}
          description={notFound ? t('notFound.description') : undefined}
          action={
            notFound ? undefined : (
              <Button variant="secondary" onClick={() => void order.refetch()}>
                {common('retry')}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const data = order.data;
  const closed = data.status === 'DELIVERED' || data.status === 'CANCELLED';

  return (
    <div className="space-y-5">
      {back}

      <header className="relative overflow-hidden rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-berry-200/40 blur-3xl dark:bg-berry-800/20"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{data.code}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <Icon name="users" className="size-4 text-muted" />
              <span className="font-semibold">{data.customer.name}</span>
              <span className="text-muted">· {meta(`customerTypes.${data.customer.type}`)}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={data.priority} />
            <OrderStatusChip status={data.status} />
          </div>
        </div>
        <dl className="relative mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('dueDate')}
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold">
              {format.dateTime(calendarDateToUtc(data.dueDate), {
                timeZone: 'UTC',
                dateStyle: 'long',
              })}
              {closed ? null : <DueCountdown dueDate={data.dueDate} />}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('createdAt')}
            </dt>
            <dd className="mt-1 font-semibold">
              {format.dateTime(new Date(data.createdAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
          {data.notes ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('notes')}
              </dt>
              <dd className="mt-1">{data.notes}</dd>
            </div>
          ) : null}
        </dl>
        <div className="relative mt-6">
          <StatusStepper status={data.status} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <OrderActions order={data} role={user.role} />
          <Items order={data} />
        </div>
        <History order={data} userId={user.id} />
      </div>
    </div>
  );
}
