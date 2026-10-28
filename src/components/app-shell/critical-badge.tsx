'use client';

import { useTranslations } from 'next-intl';
import { useAlerts } from '@/features/alerts/api';
import { countBySeverity } from '@/features/alerts/alert-messages';

/** Count of CRITICAL alerts on the Alerts entry; hidden when there are none. */
export function CriticalBadge({ floating = false }: { floating?: boolean }) {
  const t = useTranslations('AppShell');
  const alerts = useAlerts();
  const count = alerts.data ? countBySeverity(alerts.data, 'CRITICAL') : 0;
  if (count === 0) return null;

  return (
    <span
      aria-label={t('criticalBadge', { count })}
      role="status"
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-critical-600 px-1.5 text-[0.68rem] font-bold leading-5 text-white shadow-[0_2px_0_0_var(--color-critical-800)] motion-safe:animate-urgent-pulse ${
        floating ? 'absolute -right-1 -top-1' : ''
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
