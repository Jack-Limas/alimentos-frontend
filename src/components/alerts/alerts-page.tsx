'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useSharedAlerts } from '@/features/alerts/use-shared-alerts';
import { countByType, filterByType, groupBySeverity } from '@/features/alerts/alert-messages';
import { ALERT_TYPES, type AlertSeverity, type AlertType } from '@/features/alerts/types';
import { AlertCard } from './alert-card';

const sectionStyle: Record<AlertSeverity, string> = {
  CRITICAL: 'text-critical-700 dark:text-critical-300',
  WARNING: 'text-expiry-800 dark:text-expiry-200',
  INFO: 'text-lagoon-700 dark:text-lagoon-200',
};

export function AlertsPage() {
  const t = useTranslations('Alerts');
  const common = useTranslations('Common');
  const format = useFormatter();
  const alerts = useSharedAlerts();
  const [types, setTypes] = useState<AlertType[]>([]);

  const toggle = (type: AlertType) =>
    setTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );

  const all = alerts.data ?? [];
  const counts = countByType(all);
  const groups = groupBySeverity(filterByType(all, types));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-critical-700 dark:text-critical-300">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t('intro')}</p>
        </div>
        <div className="flex items-center gap-3">
          {alerts.dataUpdatedAt ? (
            <p className="text-xs text-muted">
              {t('updated', {
                time: format.dateTime(new Date(alerts.dataUpdatedAt), { timeStyle: 'short' }),
              })}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="arrows" className="size-4" />}
            onClick={() => void alerts.refetch()}
            disabled={alerts.isFetching}
          >
            {t('refresh')}
          </Button>
        </div>
      </header>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t('filters')}</legend>
        <button
          type="button"
          aria-pressed={types.length === 0}
          onClick={() => setTypes([])}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 ${
            types.length === 0
              ? 'bg-forest-800 text-forest-50 ring-forest-800 dark:bg-forest-600'
              : 'bg-surface text-muted ring-border hover:text-foreground'
          }`}
        >
          {t('allTypes')} · {all.length}
        </button>
        {ALERT_TYPES.map((type) => {
          const pressed = types.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(type)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 motion-reduce:active:scale-100 ${
                pressed
                  ? 'bg-expiry-300 text-forest-950 ring-expiry-400 shadow-[0_2px_0_0_var(--color-expiry-600)]'
                  : 'bg-surface text-muted ring-border hover:text-foreground'
              }`}
            >
              {t(`types.${type}`)} · {counts[type] ?? 0}
            </button>
          );
        })}
      </fieldset>

      {alerts.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            {t('loading')}
          </p>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : alerts.isError ? (
        <EmptyState
          illustration="search"
          title={common('loadError')}
          action={
            <Button variant="secondary" onClick={() => void alerts.refetch()}>
              {common('retry')}
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      ) : (
        groups.map((group) => (
          <section key={group.severity} aria-labelledby={`alerts-${group.severity}`}>
            <h2
              id={`alerts-${group.severity}`}
              className={`mb-3 flex items-center gap-2 font-display text-lg font-semibold ${sectionStyle[group.severity]}`}
            >
              {t(`severity.${group.severity}`)}
              <span className="rounded-full bg-surface-muted px-2 py-0.5 font-sans text-xs text-foreground">
                {group.alerts.length}
              </span>
            </h2>
            <ul className="grid gap-3 xl:grid-cols-2">
              {group.alerts.map((alert, index) => (
                <AlertCard
                  key={`${alert.type}-${alert.entityId}-${alert.code}`}
                  alert={alert}
                  index={index}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
