import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { BackendPanel, IsolationPanel, WorkersPanel } from '@/components/system-check';
import type { Locale } from '@/i18n/routing';

interface SystemCheckPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SystemCheckPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'SystemCheck' });
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Diagnostics page used in the project defense. Static shell, values read on the client. */
export default function SystemCheckPage({ params }: SystemCheckPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations('SystemCheck');

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
        {t('eyebrow')}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-2 max-w-2xl text-muted">{t('subtitle')}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <IsolationPanel />
        <BackendPanel />
        <WorkersPanel />
      </div>
    </section>
  );
}
