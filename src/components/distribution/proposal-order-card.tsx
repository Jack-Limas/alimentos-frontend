'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { FreshnessBar } from '@/components/inventory/freshness-bar';
import { DueCountdown, OrderStatusChip, PriorityBadge } from '@/components/orders/order-badges';
import { daysBetween } from '@/features/distribution/engine';
import { planReasonMessage } from '@/features/distribution/reasons';
import type { ProposalLineDto, ProposalOrderDto } from '@/features/distribution/types';
import { Link } from '@/i18n/navigation';
import { fulfillmentTone } from './simulator';

function Reasons({ line }: { line: ProposalLineDto }) {
  const t = useTranslations('Distribution.reasons');
  const units = useTranslations('Catalog.units.short');
  return (
    <ul className="flex flex-wrap gap-1.5">
      {line.reasons.map((reason, index) => {
        const message = planReasonMessage(reason, units(line.unit));
        return (
          <li
            key={`${reason.code}-${String(index)}`}
            className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium ring-1 ring-border"
          >
            {t(message.key, message.values)}
          </li>
        );
      })}
    </ul>
  );
}

/** One order of the plan: its place, score and the (item, lot) lines. */
export function ProposalOrderCard({
  order,
  businessDate,
}: {
  order: ProposalOrderDto;
  businessDate: string;
}) {
  const t = useTranslations('Distribution');
  const meta = useTranslations('OrderMeta');
  const units = useTranslations('Catalog.units.short');
  const columns = useTranslations('Distribution.detail.columns');
  const formatter = useFormatter();
  const format = (value: number, unit: ProposalLineDto['unit']) =>
    `${formatter.number(value, { maximumFractionDigits: 3 })} ${units(unit)}`;

  return (
    <li className="rounded-card bg-surface p-4 shadow-card ring-1 ring-border sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-forest-700 font-display text-lg font-semibold text-white shadow-[0_3px_0_0_var(--color-forest-900)] dark:bg-forest-500">
          {order.rank}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/app/orders/${order.orderId}`}
            className="font-display text-lg font-semibold hover:underline"
          >
            {order.code}
          </Link>
          <p className="truncate text-sm text-muted">
            {order.customerName} · {meta(`customerTypes.${order.customerType}`)}
          </p>
        </div>
        <PriorityBadge priority={order.priority} />
        <DueCountdown dueDate={order.dueDate} />
        {order.fulfillment ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${fulfillmentTone[order.fulfillment]}`}
          >
            {t(`fulfillment.${order.fulfillment}`)}
          </span>
        ) : null}
        <span className="font-display font-semibold tabular-nums">
          {t('score', { score: order.score })}
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <OrderStatusChip status={order.orderStatus} />
        {order.rescores > 0 ? <span>{t('detail.rescores', { count: order.rescores })}</span> : null}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 pr-3 font-semibold">{columns('product')}</th>
              <th className="py-2 pr-3 font-semibold">{columns('lot')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{columns('requested')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{columns('available')}</th>
              <th className="py-2 pr-3 text-right font-semibold">{columns('recommended')}</th>
              <th className="py-2 font-semibold">{columns('reasons')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border align-top">
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-2.5 pr-3 font-semibold">{line.productName}</td>
                <td className="w-44 py-2.5 pr-3">
                  {line.lotExpiryDate ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted">
                        {t('detail.lotCode', {
                          code: line.lotCode ?? line.lotId?.slice(0, 8) ?? '',
                        })}
                      </span>
                      <FreshnessBar
                        daysLeft={daysBetween(businessDate, line.lotExpiryDate)}
                        size="sm"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-critical-700 dark:text-critical-300">
                      {t('detail.noLot')}
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {format(line.requestedQty, line.unit)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-muted">
                  {format(line.availableQty, line.unit)}
                </td>
                <td className="py-2.5 pr-3 text-right font-display font-semibold tabular-nums">
                  {format(line.recommendedQty, line.unit)}
                </td>
                <td className="py-2.5">
                  <Reasons line={line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </li>
  );
}
