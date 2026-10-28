'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/icons';
import { missionProgress } from '@/features/missions/missions';
import type { Order } from '@/features/orders/types';
import { Link } from '@/i18n/navigation';
import { DueCountdown, OrderStatusChip, PriorityBadge } from './order-badges';

const priorityEdge = {
  URGENT: 'before:bg-critical-500',
  HIGH: 'before:bg-expiry-400',
  MEDIUM: 'before:bg-lagoon-400',
  LOW: 'before:bg-sand-300 dark:before:bg-sand-600',
} as const;

/** An order at a glance: code, priority, customer, countdown, status and progress. */
export function OrderCard({ order, index = 0 }: { order: Order; index?: number }) {
  const t = useTranslations('Orders');
  const meta = useTranslations('OrderMeta');
  const progress = missionProgress(order.status);

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="motion-safe:animate-rise-in"
    >
      <Link
        href={`/app/orders/${order.id}`}
        aria-label={t('openDetail', { code: order.code })}
        className={`group relative block h-full overflow-hidden rounded-card bg-surface p-4 pl-5 shadow-card ring-1 ring-border transition before:absolute before:inset-y-0 before:left-0 before:w-1.5 hover:-translate-y-0.5 hover:ring-forest-300 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:ring-forest-600 ${priorityEdge[order.priority]}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight">{order.code}</p>
            <p className="truncate text-sm font-semibold">{order.customer.name}</p>
            <p className="text-xs text-muted">{meta(`customerTypes.${order.customer.type}`)}</p>
          </div>
          <PriorityBadge priority={order.priority} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <OrderStatusChip status={order.status} />
          {order.status === 'DELIVERED' || order.status === 'CANCELLED' ? null : (
            <DueCountdown dueDate={order.dueDate} />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div
            aria-hidden="true"
            className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              style={{ width: `${order.status === 'CANCELLED' ? 0 : progress.percent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-lagoon-400 via-brand-500 to-brand-600"
            />
          </div>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Icon name="boxes" className="size-3.5" />
            {t('items', { count: order.itemCount })}
          </span>
        </div>
      </Link>
    </li>
  );
}
