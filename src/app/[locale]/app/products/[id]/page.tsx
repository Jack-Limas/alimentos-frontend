import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ProductDetailPage } from '@/components/products/product-detail-page';
import type { Locale } from '@/i18n/routing';

interface ProductRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'ProductDetail' });
  return { title: t('metaTitle') };
}

export default function ProductRoute({ params }: ProductRouteProps) {
  const { locale, id } = use(params);
  setRequestLocale(locale as Locale);

  return <ProductDetailPage id={id} />;
}
