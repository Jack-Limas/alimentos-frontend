'use client';

import { useTranslations } from 'next-intl';
import { DueCountdown, PriorityBadge } from '@/components/orders/order-badges';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icons';
import type { Role } from '@/features/auth/types';
import { missionProgress } from '@/features/missions/missions';
import { nextStep } from '@/features/orders/state-machine';
import type { Order, OrderStatus } from '@/features/orders/types';
import { Link } from '@/i18n/navigation';

const stepStyle: Partial<
  Record<OrderStatus, { tone: string; icon: IconName; button: 'lagoon' | 'berry' | 'primary' }>
> = {
  IN_PREPARATION: { tone: 'from-lagoon-400 to-lagoon-600', icon: 'boxes', button: 'lagoon' },
  READY_FOR_DISPATCH: { tone: 'from-expiry-300 to-expiry-500', icon: 'truck', button: 'berry' },
  SHIPPED: { tone: 'from-berry-400 to-brand-500', icon: 'pin', button: 'primary' },
};

const nextIcon: Partial<Record<OrderStatus, IconName>> = {
  READY_FOR_DISPATCH: 'check',
  SHIPPED: 'truck',
  DELIVERED: 'trophy',
};

interface MissionCardProps {
  order: Order;
  role: Role;
  busy: boolean;
  onAdvance: (order: Order, to: OrderStatus) => void;
  index?: number;
}

/** One mission: what to do now, how far it is, and one big button to move it forward. */
export function MissionCard({ order, role, busy, onAdvance, index = 0 }: MissionCardProps) {
  const t = useTranslations('Missions');
  const meta = useTranslations('OrderMeta');
  const progress = missionProgress(order.status);
  const style = stepStyle[order.status] ?? stepStyle.IN_PREPARATION;
  const to = nextStep(order.status, role);

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
      className="relative overflow-hidden rounded-[1.6rem] bg-surface shadow-card ring-1 ring-border motion-safe:animate-rise-in"
    >
      <div
        className={`flex items-center gap-3 bg-gradient-to-r px-4 py-3 text-white ${style?.tone ?? ''}`}
      >
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-white/25 backdrop-blur">
          <Icon name={style?.icon ?? 'boxes'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-white/85">
            {order.status === 'IN_PREPARATION' ||
            order.status === 'READY_FOR_DISPATCH' ||
            order.status === 'SHIPPED'
              ? t(`steps.${order.status}`)
              : meta(`status.${order.status}`)}
          </p>
          <p className="font-display text-xl font-semibold leading-tight [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]">
            {order.code}
          </p>
        </div>
        <PriorityBadge priority={order.priority} />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{order.customer.name}</p>
          <DueCountdown dueDate={order.dueDate} />
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted">
            <span>{t('progress', { step: progress.step, total: progress.total })}</span>
            <span className="tabular-nums">{progress.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label={t('progress', { step: progress.step, total: progress.total })}
            className="h-3 overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-border"
          >
            <div
              style={{ width: `${String(progress.percent)}%` }}
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-500),var(--color-lagoon-400),var(--color-brand-500))] bg-[length:200%_100%] transition-[width] duration-500 motion-safe:animate-progress-sheen"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {to ? (
            <Button
              size="lg"
              variant={style?.button ?? 'primary'}
              icon={<Icon name={nextIcon[to] ?? 'check'} />}
              disabled={busy}
              onClick={() => onAdvance(order, to)}
              className="flex-1"
            >
              {to === 'READY_FOR_DISPATCH' || to === 'SHIPPED' || to === 'DELIVERED'
                ? t(`advance.${to}`)
                : meta(`status.${to}`)}
            </Button>
          ) : null}
          <Link
            href={`/app/orders/${order.id}`}
            className="inline-flex h-14 items-center rounded-full px-4 text-sm font-semibold text-primary hover:bg-surface-muted"
          >
            {t('openOrder')}
          </Link>
        </div>
      </div>
    </li>
  );
}
