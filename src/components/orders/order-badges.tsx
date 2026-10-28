'use client';

import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/icons';
import { dueCountdown, urgencyOf, type Urgency } from '@/features/orders/countdown';
import type { OrderPriority, OrderStatus } from '@/features/orders/types';
import type { CalendarDate } from '@/lib/dates';

const priorityStyle: Record<OrderPriority, { chip: string; icon: IconName }> = {
  URGENT: {
    chip: 'bg-critical-600 text-white ring-critical-700 motion-safe:animate-urgent-pulse dark:bg-critical-500 dark:text-critical-950',
    icon: 'flame',
  },
  HIGH: {
    chip: 'bg-expiry-200 text-expiry-900 ring-expiry-300 dark:bg-expiry-500/25 dark:text-expiry-100 dark:ring-expiry-600',
    icon: 'out',
  },
  MEDIUM: {
    chip: 'bg-lagoon-100 text-lagoon-800 ring-lagoon-200 dark:bg-lagoon-900/50 dark:text-lagoon-100 dark:ring-lagoon-700',
    icon: 'arrows',
  },
  LOW: {
    chip: 'bg-sand-100 text-sand-700 ring-sand-200 dark:bg-sand-800 dark:text-sand-200 dark:ring-sand-700',
    icon: 'in',
  },
};

/** Priority with its own color and icon; the text always says it too. */
export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  const t = useTranslations('OrderMeta');
  const style = priorityStyle[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${style.chip}`}
      title={t('priorityLabel', { priority: t(`priority.${priority}`) })}
    >
      <Icon name={style.icon} className="size-3.5" />
      {t(`priority.${priority}`)}
    </span>
  );
}

const urgencyStyle: Record<Urgency, string> = {
  overdue: 'text-critical-700 dark:text-critical-300',
  today: 'text-expiry-800 dark:text-expiry-200',
  soon: 'text-expiry-700 dark:text-expiry-300',
  later: 'text-muted',
};

/** "Vence hoy", "Vence en 2 días", "Vencido hace 1 día", counted in Bogota. */
export function DueCountdown({ dueDate, now }: { dueDate: CalendarDate; now?: Date }) {
  const t = useTranslations('OrderMeta.countdown');
  const countdown = dueCountdown(dueDate, now);
  const label =
    countdown.kind === 'today'
      ? t('today')
      : countdown.kind === 'upcoming'
        ? t('upcoming', { days: countdown.days })
        : t('overdue', { days: countdown.days });
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold ${urgencyStyle[urgencyOf(countdown)]}`}
    >
      <Icon name="clock" className="size-3.5" />
      {label}
    </span>
  );
}

const statusStyle: Record<OrderStatus, string> = {
  PENDING:
    'bg-sand-100 text-sand-800 ring-sand-200 dark:bg-sand-800 dark:text-sand-100 dark:ring-sand-700',
  IN_PREPARATION:
    'bg-lagoon-100 text-lagoon-800 ring-lagoon-200 dark:bg-lagoon-900/50 dark:text-lagoon-100 dark:ring-lagoon-700',
  READY_FOR_DISPATCH:
    'bg-expiry-100 text-expiry-900 ring-expiry-200 dark:bg-expiry-900/40 dark:text-expiry-100 dark:ring-expiry-700',
  SHIPPED:
    'bg-berry-100 text-berry-800 ring-berry-200 dark:bg-berry-900/40 dark:text-berry-100 dark:ring-berry-700',
  DELIVERED:
    'bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-900/50 dark:text-brand-100 dark:ring-brand-700',
  CANCELLED:
    'bg-critical-50 text-critical-700 ring-critical-200 line-through decoration-1 dark:bg-critical-900/30 dark:text-critical-200 dark:ring-critical-800',
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const t = useTranslations('OrderMeta.status');
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle[status]}`}
    >
      {t(status)}
    </span>
  );
}
