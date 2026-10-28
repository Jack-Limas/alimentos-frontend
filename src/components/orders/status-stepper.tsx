'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/icons';
import { flowIndex, ORDER_FLOW } from '@/features/orders/state-machine';
import type { OrderStatus } from '@/features/orders/types';

/** Pendiente → En preparación → Listo → Enviado → Entregado, with the current step lit. */
export function StatusStepper({
  status,
  compact = false,
}: {
  status: OrderStatus;
  compact?: boolean;
}) {
  const t = useTranslations('OrderMeta');
  const current = flowIndex(status);

  if (status === 'CANCELLED') {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-critical-50 px-4 py-3 text-sm font-semibold text-critical-800 ring-1 ring-critical-200 dark:bg-critical-900/30 dark:text-critical-200 dark:ring-critical-800">
        <Icon name="x" /> {t('cancelledFlow')}
      </p>
    );
  }

  return (
    <ol aria-label={t('stepper')} className="flex items-start">
      {ORDER_FLOW.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li
            key={step}
            aria-label={t('stepState', {
              step: t(`status.${step}`),
              state: t(`stepStates.${state}`),
            })}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full ${
                  index <= current ? 'bg-brand-500 dark:bg-brand-400' : 'bg-border'
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-10 flex size-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-surface transition ${
                state === 'done'
                  ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-brand-950'
                  : state === 'current'
                    ? 'bg-expiry-300 text-forest-950 shadow-[0_3px_0_0_var(--color-expiry-600)]'
                    : 'bg-surface-muted text-muted'
              }`}
            >
              {state === 'done' ? <Icon name="check" className="size-4" /> : index + 1}
            </span>
            {compact ? null : (
              <span
                className={`mt-2 hidden text-[0.7rem] font-semibold leading-tight sm:block ${
                  state === 'todo' ? 'text-muted' : 'text-foreground'
                }`}
              >
                {t(`status.${step}`)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
