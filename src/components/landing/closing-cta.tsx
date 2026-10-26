import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function ClosingCta() {
  const t = useTranslations('Landing.closing');

  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-card bg-brand-900 px-6 py-12 text-brand-50 sm:px-12 lg:flex-row lg:items-center lg:justify-between dark:bg-brand-950 dark:ring-1 dark:ring-brand-800">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {t('title')}
          </h2>
          <p className="text-brand-200">{t('body')}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-12 shrink-0 items-center rounded-full bg-brand-50 px-7 font-semibold text-brand-900 transition-colors hover:bg-white"
        >
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
