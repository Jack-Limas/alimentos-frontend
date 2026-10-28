import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { DistributionPage } from '@/components/distribution/distribution-page';
import type { Locale } from '@/i18n/routing';

interface DistributionRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DistributionRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Distribution' });
  return { title: t('metaTitle') };
}

export default function DistributionRoute({ params }: DistributionRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // Both roles plan the warehouse day (contract 4.7). The simulation runs in a Web Worker.
  return <DistributionPage />;
}
