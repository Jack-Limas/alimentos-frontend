'use client';

import { useTranslations } from 'next-intl';
import { AlertCard } from '@/components/alerts/alert-card';
import { DueCountdown, OrderStatusChip, PriorityBadge } from '@/components/orders/order-badges';
import { Icon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts } from '@/features/alerts/api';
import { useOrders } from '@/features/orders/api';
import { OPEN_STATUSES, toOrdersApiQuery } from '@/features/orders/filters';
import { Link } from '@/i18n/navigation';
import { addDays, businessToday } from '@/lib/dates';

const MAX_ITEMS = 4;

/** The CRITICAL alerts, first ones only, with a link to the full list. */
export function CriticalAlertsCard() {
  const t = useTranslations('Dashboard.critical');
  const alerts = useAlerts();
  const critical = (alerts.data ?? []).filter((alert) => alert.severity === 'CRITICAL');

  return (
    <section
      aria-labelledby="dash-critical"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="dash-critical"
          className="flex items-center gap-2 font-display text-lg font-semibold"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-critical-100 text-critical-700 dark:bg-critical-900/50 dark:text-critical-200">
            <Icon name="bell" className="size-4.5" />
          </span>
          {t('title')}
          {critical.length > 0 ? (
            <span className="rounded-full bg-critical-600 px-2 py-0.5 font-sans text-xs font-bold text-white">
              {critical.length}
            </span>
          ) : null}
        </h2>
        <Link
          href="/app/alerts"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('seeAll')}
        </Link>
      </div>
      {alerts.isPending ? (
        <Skeleton className="mt-4 h-24 rounded-2xl" />
      ) : critical.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {critical.slice(0, MAX_ITEMS).map((alert, index) => (
            <AlertCard key={`${alert.entityId}-${alert.code}`} alert={alert} index={index} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Open orders due today or tomorrow (dueBefore is exclusive, so today + 2). */
export function DueOrdersCard() {
  const t = useTranslations('Dashboard.dueOrders');
  const query = toOrdersApiQuery(
    { statuses: [...OPEN_STATUSES], dueBefore: addDays(businessToday(), 2), page: 1 },
    MAX_ITEMS * 2,
  );
  const orders = useOrders(query);
  const list = orders.data?.data ?? [];

  return (
    <section
      aria-labelledby="dash-due"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="dash-due" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-expiry-100 text-expiry-800 dark:bg-expiry-900/50 dark:text-expiry-200">
            <Icon name="clock" className="size-4.5" />
          </span>
          {t('title')}
        </h2>
        <Link
          href="/app/orders?status=PENDING,IN_PREPARATION,READY_FOR_DISPATCH"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('seeAll')}
        </Link>
      </div>
      {orders.isPending ? (
        <Skeleton className="mt-4 h-24 rounded-2xl" />
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {list.slice(0, MAX_ITEMS * 2).map((order) => (
            <li key={order.id}>
              <Link
                href={`/app/orders/${order.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-3 transition hover:bg-surface-muted"
              >
                <span className="font-display font-semibold">{order.code}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {order.customer.name}
                </span>
                <DueCountdown dueDate={order.dueDate} />
                <PriorityBadge priority={order.priority} />
                <OrderStatusChip status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
