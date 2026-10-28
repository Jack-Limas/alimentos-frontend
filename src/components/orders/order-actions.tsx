'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { Icon, type IconName } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import type { Role } from '@/features/auth/types';
import { useChangeOrderStatus } from '@/features/orders/api';
import { availableTransitions } from '@/features/orders/state-machine';
import { mapStatusError, type StatusErrorKey } from '@/features/orders/status-errors';
import type { OrderDetail, OrderStatus } from '@/features/orders/types';

const actionStyle: Partial<
  Record<OrderStatus, { variant: 'primary' | 'lagoon' | 'berry' | 'danger'; icon: IconName }>
> = {
  READY_FOR_DISPATCH: { variant: 'lagoon', icon: 'check' },
  SHIPPED: { variant: 'berry', icon: 'truck' },
  DELIVERED: { variant: 'primary', icon: 'trophy' },
  CANCELLED: { variant: 'danger', icon: 'x' },
};

/** Only the status changes this role can make from here; the server validates them again. */
export function OrderActions({ order, role }: { order: OrderDetail; role: Role }) {
  const t = useTranslations('OrderDetail.actions');
  const errors = useTranslations('Orders.statusErrors');
  const statusLabel = useTranslations('OrderMeta.status');
  const forms = useTranslations('Forms');
  const toast = useToast();
  const change = useChangeOrderStatus();
  const [note, setNote] = useState('');
  const [error, setError] = useState<StatusErrorKey | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const targets = availableTransitions(order.status, role);

  async function move(status: OrderStatus) {
    setError(null);
    try {
      const updated = await change.mutateAsync({
        id: order.id,
        status,
        note: note.trim() || undefined,
      });
      setNote('');
      setConfirmCancel(false);
      toast.show(t('done', { code: updated.code, status: statusLabel(updated.status) }));
    } catch (failure) {
      setConfirmCancel(false);
      setError(mapStatusError(failure));
    }
  }

  return (
    <section
      aria-labelledby="actions-title"
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border"
    >
      <h2 id="actions-title" className="font-display text-lg font-semibold">
        {t('title')}
      </h2>

      {order.status === 'PENDING' ? (
        <p className="mt-3 flex gap-2 rounded-2xl bg-lagoon-50 px-4 py-3 text-sm text-lagoon-900 ring-1 ring-lagoon-200 dark:bg-lagoon-900/30 dark:text-lagoon-100 dark:ring-lagoon-800">
          <Icon name="truck" className="mt-0.5 size-4" />
          {t('fromDistribution')}
        </p>
      ) : null}

      {targets.length === 0 ? (
        order.status === 'PENDING' ? null : (
          <p className="mt-3 text-sm text-muted">{t('none')}</p>
        )
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">
            {t('noteLabel')}
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              placeholder={t('notePlaceholder')}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {targets.map((status) => {
              const style = actionStyle[status] ?? {
                variant: 'primary' as const,
                icon: 'check' as const,
              };
              return (
                <Button
                  key={status}
                  variant={style.variant}
                  size={status === 'CANCELLED' ? 'md' : 'lg'}
                  icon={<Icon name={style.icon} />}
                  disabled={change.isPending}
                  onClick={() =>
                    status === 'CANCELLED' ? setConfirmCancel(true) : void move(status)
                  }
                  className={status === 'CANCELLED' ? 'sm:ml-auto' : 'grow sm:grow-0'}
                >
                  {change.isPending && change.variables.status === status
                    ? forms('saving')
                    : t(`to.${status}`)}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-critical-200 bg-critical-50 px-4 py-3 text-sm font-semibold text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200"
        >
          {errors(error)}
        </p>
      ) : null}

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title={t('to.CANCELLED')}>
        <p className="text-sm">{t('confirmCancel', { code: order.code })}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            {t('keep')}
          </Button>
          <Button
            variant="danger"
            disabled={change.isPending}
            onClick={() => void move('CANCELLED')}
          >
            {change.isPending ? forms('saving') : t('to.CANCELLED')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
