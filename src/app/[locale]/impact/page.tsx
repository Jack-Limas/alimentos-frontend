import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImpactView } from '@/components/impact/impact-view';
import { fetchImpact } from '@/features/impact/impact';
import { routing, type Locale } from '@/i18n/routing';

// ISR: built at `next build` for es and en, then regenerated in the background
// at most once an hour (IMPACT_REVALIDATE_S). Route segment config must be a literal.
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface ImpactRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ImpactRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Impact' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function ImpactRoute({ params }: ImpactRouteProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  // Public data only (no session). null when the backend is down: the page still builds.
  const impact = await fetchImpact();
  return <ImpactView impact={impact} />;
}
