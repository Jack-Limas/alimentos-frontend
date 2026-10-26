import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFoundPage() {
  const t = useTranslations('NotFound');

  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="font-display text-6xl font-semibold text-primary">404</p>
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
      <p className="text-muted">{t('description')}</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        {t('backHome')}
      </Link>
    </section>
  );
}
