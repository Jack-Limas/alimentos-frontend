'use client';

import { useTranslations } from 'next-intl';
import { RoleBadge } from '@/components/auth';
import { FreshnessBar } from '@/components/inventory/freshness-bar';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { MOVEMENTS_ROLES } from '@/features/app-shell/navigation';
import { hasRole } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { useInventorySummary } from '@/features/inventory/api';
import { FRESHNESS_RULES } from '@/features/inventory/freshness';
import type { InventorySummary } from '@/features/inventory/types';
import { serializeProductFilters, type ProductFilters } from '@/features/products/filters';
import { Link } from '@/i18n/navigation';
import { KpiCard, type KpiTone } from './kpi-card';

interface KpiSpec {
  key: keyof InventorySummary;
  tone: KpiTone;
  icon: IconName;
  filters: ProductFilters;
}

/** Each KPI opens the product list with the matching filter in the URL. */
const KPIS: readonly KpiSpec[] = [
  { key: 'totalProducts', tone: 'forest', icon: 'boxes', filters: { page: 1, status: 'ACTIVE' } },
  { key: 'lowStock', tone: 'expiry', icon: 'out', filters: { page: 1, stockStatus: 'LOW' } },
  { key: 'outOfStock', tone: 'critical', icon: 'bell', filters: { page: 1, stockStatus: 'OUT' } },
  {
    key: 'expiringSoon',
    tone: 'citrus',
    icon: 'leaf',
    filters: { page: 1, expiringWithinDays: FRESHNESS_RULES.WARNING_DAYS },
  },
  { key: 'wasteRiskHigh', tone: 'berry', icon: 'arrows', filters: { page: 1, wasteRisk: 'HIGH' } },
];

function productsHref(filters: ProductFilters): string {
  const query = serializeProductFilters(filters);
  return query ? `/app/products?${query}` : '/app/products';
}

export function DashboardHome() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');
  const { user } = useAuth();
  const summary = useInventorySummary();
  if (user === null) return null;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-card bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-10 size-56 rounded-full bg-brand-200/60 blur-3xl dark:bg-brand-800/30"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-24 size-36 rounded-full bg-expiry-200/70 blur-3xl dark:bg-expiry-700/20"
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {t('eyebrow')}
        </p>
        <div className="relative mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('greeting', { name: user.name })}
          </h1>
          <RoleBadge role={user.role} />
        </div>
        <p className="relative mt-2 max-w-2xl text-muted">{t('intro')}</p>
      </header>

      <section aria-label={t('kpisLabel')}>
        {summary.isPending ? (
          <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <p role="status" className="sr-only">
              {t('loadingKpis')}
            </p>
            {KPIS.map((kpi) => (
              <Skeleton key={kpi.key} className="h-36 rounded-card" />
            ))}
          </div>
        ) : summary.isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-critical-200 bg-critical-50 p-5 text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200">
            <p className="flex-1 text-sm font-semibold">{common('loadError')}</p>
            <Button variant="secondary" size="sm" onClick={() => void summary.refetch()}>
              {common('retry')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {KPIS.map((kpi) => (
              <KpiCard
                key={kpi.key}
                href={productsHref(kpi.filters)}
                value={summary.data[kpi.key]}
                label={t(`kpis.${kpi.key}.label`)}
                hint={t(`kpis.${kpi.key}.hint`)}
                tone={kpi.tone}
                icon={<Icon name={kpi.icon} />}
                openLabel={t('openList')}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold">{t('shortcuts.title')}</h2>
          <ul className="mt-4 space-y-2">
            <li>
              <Link
                href="/app/products"
                className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition hover:bg-surface-muted active:scale-[0.98] motion-reduce:active:scale-100"
              >
                <Icon name="search" className="size-5 text-primary" />
                {t('shortcuts.products')}
              </Link>
            </li>
            {hasRole(user, MOVEMENTS_ROLES) ? (
              <li>
                <Link
                  href="/app/movements"
                  className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition hover:bg-surface-muted active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <Icon name="arrows" className="size-5 text-lagoon-600 dark:text-lagoon-300" />
                  {t('shortcuts.movements')}
                </Link>
              </li>
            ) : (
              <li className="px-3 pt-1 text-sm text-muted">{t('shortcuts.operatorHint')}</li>
            )}
          </ul>
        </section>

        <section className="rounded-card bg-forest-50 p-6 ring-1 ring-forest-100 dark:bg-forest-950/60 dark:ring-forest-800">
          <h2 className="font-display text-lg font-semibold">{t('tip.title')}</h2>
          <p className="mt-2 text-sm text-muted">{t('tip.body')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FreshnessBar daysLeft={24} lifeDays={30} size="sm" />
            <FreshnessBar daysLeft={5} lifeDays={30} size="sm" />
            <FreshnessBar daysLeft={1} lifeDays={30} size="sm" />
            <FreshnessBar daysLeft={-2} lifeDays={30} size="sm" />
          </div>
        </section>
      </div>
    </div>
  );
}
