'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { RoleBadge } from '@/components/auth';
import { RequireRole } from '@/features/auth/guards';
import { useAuth } from '@/features/auth/use-auth';

const UPCOMING = ['inventory', 'orders', 'distribution', 'alerts'] as const;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Provisional dashboard: greets the user and shows the role. No business data yet. */
export function DashboardHome() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  if (user === null) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('greeting', { name: user.name })}
        </h1>
        <RoleBadge role={user.role} />
      </div>
      <p className="mt-3 max-w-2xl text-muted">{t('intro')}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title={t('session.title')}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">{t('session.email')}</dt>
              <dd className="mt-0.5 break-all font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('session.role')}</dt>
              <dd className="mt-1">
                <RoleBadge role={user.role} />
              </dd>
            </div>
          </dl>
        </Card>

        <Card title={t('admin.title')}>
          <RequireRole roles={['ADMIN']}>
            <p className="text-sm text-muted">{t('admin.body')}</p>
          </RequireRole>
        </Card>

        <Card title={t('upcoming.title')}>
          <ul className="space-y-2 text-sm">
            {UPCOMING.map((item) => (
              <li key={item} className="flex items-center gap-2 text-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-400" />
                {t(`upcoming.${item}`)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
