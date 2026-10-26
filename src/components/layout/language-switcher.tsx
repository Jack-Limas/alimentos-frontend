'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/** Switches locale while keeping the current path (e.g. /es/login → /en/login). */
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex items-center rounded-full border border-border bg-surface p-1 text-sm font-semibold">
        {routing.locales.map((locale) => {
          const active = locale === currentLocale;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                title={t(locale)}
                className={`inline-flex h-8 min-w-10 items-center justify-center rounded-full px-3 uppercase transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                <span aria-hidden="true">{locale}</span>
                <span className="sr-only">{t(locale)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
