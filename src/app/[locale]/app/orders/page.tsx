import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { PrivateAreaSkeleton } from '@/components/auth';
import { OrdersPage } from '@/components/orders/orders-page';
import type { Locale } from '@/i18n/routing';

interface OrdersRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: OrdersRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Orders' });
  return { title: t('metaTitle') };
}

export default function OrdersRoute({ params }: OrdersRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // Filters are read from the URL on the client.
  return (
    <Suspense fallback={<PrivateAreaSkeleton />}>
      <OrdersPage />
    </Suspense>
  );
}
