import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { OrderDetailPage } from '@/components/orders/order-detail-page';
import type { Locale } from '@/i18n/routing';

interface OrderRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: OrderRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'OrderDetail' });
  return { title: t('metaTitle') };
}

export default function OrderRoute({ params }: OrderRouteProps) {
  const { locale, id } = use(params);
  setRequestLocale(locale as Locale);

  return <OrderDetailPage id={id} />;
}
