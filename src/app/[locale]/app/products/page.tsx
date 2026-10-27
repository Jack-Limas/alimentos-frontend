import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { PrivateAreaSkeleton } from '@/components/auth';
import { ProductsPage } from '@/components/products/products-page';
import type { Locale } from '@/i18n/routing';

interface ProductsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ProductsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Products' });
  return { title: t('metaTitle') };
}

export default function ProductsRoute({ params }: ProductsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // The filters are read from the URL on the client, so the static HTML stops at this boundary.
  return (
    <Suspense fallback={<PrivateAreaSkeleton />}>
      <ProductsPage />
    </Suspense>
  );
}
