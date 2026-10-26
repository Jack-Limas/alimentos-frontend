import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Login' });
  return { title: t('metaTitle') };
}

const inputClass =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-ring/30';

/** Static (SSG) mock: no form submission and no auth logic until the auth phase. */
export default function LoginPage({ params }: LoginPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations('Login');

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted">{t('subtitle')}</p>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
            />
          </div>

          {/* type="button" on purpose: nothing is submitted until auth exists. */}
          <button
            type="button"
            disabled
            aria-describedby="login-preview-notice"
            className="h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground opacity-70"
          >
            {t('submit')}
          </button>
          <p
            id="login-preview-notice"
            className="rounded-xl bg-expiry-50 px-4 py-3 text-sm text-expiry-800 dark:bg-expiry-900/30 dark:text-expiry-200"
          >
            {t('previewNotice')}
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {t('backHome')}
        </Link>
      </div>
    </section>
  );
}
