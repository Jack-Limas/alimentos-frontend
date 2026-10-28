'use client';

import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/icons';
import { alertView } from '@/features/alerts/alert-messages';
import type { Alert, AlertSeverity, AlertType } from '@/features/alerts/types';
import { Link } from '@/i18n/navigation';

const typeIcon: Record<AlertType, IconName> = {
  LOW_STOCK: 'boxes',
  SHORTAGE_RISK: 'out',
  EXPIRING_SOON: 'leaf',
  WASTE_RISK: 'trash',
  ORDER_DUE_SOON: 'clock',
};

const severityStyle: Record<AlertSeverity, { edge: string; icon: string; tag: string }> = {
  CRITICAL: {
    edge: 'before:bg-critical-500',
    icon: 'bg-critical-100 text-critical-700 dark:bg-critical-900/50 dark:text-critical-200',
    tag: 'text-critical-700 dark:text-critical-300',
  },
  WARNING: {
    edge: 'before:bg-expiry-400',
    icon: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/50 dark:text-expiry-200',
    tag: 'text-expiry-800 dark:text-expiry-200',
  },
  INFO: {
    edge: 'before:bg-lagoon-400',
    icon: 'bg-lagoon-100 text-lagoon-800 dark:bg-lagoon-900/50 dark:text-lagoon-200',
    tag: 'text-lagoon-700 dark:text-lagoon-200',
  },
};

/** One alert: colored edge and icon, translated message and a link to the product or order. */
export function AlertCard({ alert, index = 0 }: { alert: Alert; index?: number }) {
  const t = useTranslations('Alerts');
  const view = alertView(alert);
  const style = severityStyle[alert.severity];

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`relative flex items-start gap-3 overflow-hidden rounded-2xl bg-surface p-4 pl-5 shadow-card ring-1 ring-border before:absolute before:inset-y-0 before:left-0 before:w-1.5 motion-safe:animate-rise-in ${style.edge}`}
    >
      <span
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
      >
        <Icon name={typeIcon[alert.type]} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[0.7rem] font-bold uppercase tracking-wide ${style.tag}`}>
          {t(`severityOne.${alert.severity}`)} · {t(`types.${alert.type}`)}
        </p>
        <p className="mt-1 text-sm leading-snug">{t(`codes.${view.key}`, view.values)}</p>
      </div>
      <Link
        href={view.href}
        className="inline-flex shrink-0 items-center gap-1 self-center rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface-muted"
      >
        {t('open')}
        <span className="sr-only">{view.subject}</span>
        <Icon name="chevron" className="size-4" />
      </Link>
    </li>
  );
}
