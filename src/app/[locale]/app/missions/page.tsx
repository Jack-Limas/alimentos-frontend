import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { MissionsPage } from '@/components/missions/missions-page';
import type { Locale } from '@/i18n/routing';

interface MissionsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MissionsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Missions' });
  return { title: t('metaTitle') };
}

export default function MissionsRoute({ params }: MissionsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  return <MissionsPage />;
}
