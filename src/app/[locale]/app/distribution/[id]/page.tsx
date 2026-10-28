import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ProposalDetailPage } from '@/components/distribution/proposal-detail-page';
import type { Locale } from '@/i18n/routing';

interface ProposalRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: ProposalRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Distribution.detail' });
  return { title: t('metaTitle') };
}

export default function ProposalRoute({ params }: ProposalRouteProps) {
  const { locale, id } = use(params);
  setRequestLocale(locale as Locale);

  return <ProposalDetailPage id={id} />;
}
