import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { LoginForm } from '@/components/auth';
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

/** Static shell (SSG); the form and the session run in the browser. */
export default function LoginPage({ params }: LoginPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations('Login');

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted">{t('subtitle')}</p>

        <LoginForm />

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
