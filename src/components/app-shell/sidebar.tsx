'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { RoleBadge } from '@/components/auth';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icons';
import { isActive, navItemsFor } from '@/features/app-shell/navigation';
import type { AuthUser } from '@/features/auth/types';
import { Link, usePathname } from '@/i18n/navigation';
import { businessToday, calendarDateToUtc } from '@/lib/dates';
import { CriticalBadge } from './critical-badge';

/** Desktop navigation: a deep forest panel next to the content. */
export function Sidebar({ user }: { user: AuthUser }) {
  const t = useTranslations('AppShell');
  const format = useFormatter();
  const pathname = usePathname();
  const today = format.dateTime(calendarDateToUtc(businessToday()), {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 overflow-hidden rounded-card bg-forest-900 p-4 text-forest-50 shadow-card ring-1 ring-forest-800 dark:bg-forest-950 dark:ring-forest-800">
        {/* A soft citrus glow in the corner gives the panel its own identity. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-expiry-300/25 blur-2xl"
        />
        <div className="relative px-2 pb-4 pt-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-200">
            {t('workspace')}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Avatar userId={user.id} name={user.name} size="lg" className="ring-forest-700" />
            <div className="min-w-0">
              <p className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight">
                {user.name}
              </p>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
        </div>

        <nav aria-label={t('navLabel')} className="relative">
          <ul className="space-y-1">
            {navItemsFor(user.role).map((item) => {
              const label = t(`nav.${item.key}`);
              if (item.comingSoon || !item.href) {
                return (
                  <li key={item.key}>
                    <span
                      aria-disabled="true"
                      aria-label={t('comingSoonLabel', { module: label })}
                      className="flex h-11 cursor-not-allowed items-center gap-2.5 rounded-xl px-3 text-sm text-forest-300"
                    >
                      <Icon name={item.icon} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className="shrink-0 rounded-full border border-forest-600 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-forest-200">
                        {t('comingSoon')}
                      </span>
                    </span>
                  </li>
                );
              }
              const active = isActive(item, pathname);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98] motion-reduce:active:scale-100 ${
                      active
                        ? 'bg-expiry-300 text-forest-950 shadow-[0_2px_0_0_var(--color-expiry-600)]'
                        : 'text-forest-50 hover:bg-forest-800'
                    }`}
                  >
                    <Icon name={item.icon} />
                    <span className="flex-1">{label}</span>
                    {item.key === 'alerts' ? <CriticalBadge /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="relative mt-5 border-t border-forest-700 px-2 pt-4 text-xs text-forest-200 first-letter:uppercase">
          {t('today', { date: today })}
        </p>
      </div>
    </aside>
  );
}
