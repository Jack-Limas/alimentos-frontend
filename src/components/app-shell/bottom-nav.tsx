'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/icons';
import { isActive, navItemsFor } from '@/features/app-shell/navigation';
import type { Role } from '@/features/auth/types';
import { Link, usePathname } from '@/i18n/navigation';

const MAX_ITEMS = 5;

/** Phone navigation, within thumb reach: the operator uses it standing in the warehouse. */
export function BottomNav({ role }: { role: Role }) {
  const t = useTranslations('AppShell');
  const pathname = usePathname();
  const items = navItemsFor(role).slice(0, MAX_ITEMS);

  return (
    <nav
      aria-label={t('mobileNavLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-800 bg-forest-900/95 pb-[env(safe-area-inset-bottom)] text-forest-50 backdrop-blur lg:hidden dark:bg-forest-950/95"
    >
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => {
          const label = t(`navShort.${item.key}`);
          if (item.comingSoon || !item.href) {
            return (
              <li key={item.key}>
                <span
                  aria-disabled="true"
                  aria-label={t('comingSoonLabel', { module: t(`nav.${item.key}`) })}
                  className="flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] text-forest-400"
                >
                  <Icon name={item.icon} />
                  <span>{t('comingSoon')}</span>
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
                className="group flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold"
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition group-active:scale-90 motion-reduce:group-active:scale-100 ${
                    active ? 'bg-expiry-300 text-forest-950' : 'text-forest-100'
                  }`}
                >
                  <Icon name={item.icon} />
                </span>
                <span className={active ? 'text-expiry-200' : 'text-forest-100'}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
