import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';

export function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <Logo />
          <p>{t('tagline')}</p>
        </div>
        <nav aria-label={t('linksLabel')} className="flex flex-col gap-1 sm:items-end">
          <Link
            href="/impact"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            {t('impact')}
          </Link>
          <p>{t('project', { year: 2026 })}</p>
        </nav>
      </div>
    </footer>
  );
}
