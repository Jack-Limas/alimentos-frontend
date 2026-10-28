import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { NewOrderPage } from '@/components/orders/new-order-page';
import { ORDER_CREATE_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface NewOrderRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: NewOrderRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'NewOrder' });
  return { title: t('metaTitle') };
}

export default function NewOrderRoute({ params }: NewOrderRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // POST /orders is ADMIN only; the API answers 403 anyway.
  return (
    <RequireRole roles={ORDER_CREATE_ROLES}>
      <NewOrderPage />
    </RequireRole>
  );
}
