import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { DashboardHome } from '@/components/dashboard';
import type { Locale } from '@/i18n/routing';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Dashboard' });
  return { title: t('metaTitle') };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  return <DashboardHome />;
}
