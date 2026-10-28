import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AlertsPage } from '@/components/alerts/alerts-page';
import type { Locale } from '@/i18n/routing';

interface AlertsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AlertsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Alerts' });
  return { title: t('metaTitle') };
}

export default function AlertsRoute({ params }: AlertsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  return <AlertsPage />;
}
