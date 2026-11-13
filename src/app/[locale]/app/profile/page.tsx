import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ProfilePage } from '@/components/profile/profile-page';
import type { Locale } from '@/i18n/routing';

interface ProfileRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ProfileRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Profile' });
  return { title: t('metaTitle') };
}

/** Every signed-in user: own details and password (or the demo notice). */
export default function ProfileRoute({ params }: ProfileRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  return <ProfilePage />;
}
