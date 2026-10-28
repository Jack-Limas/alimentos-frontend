import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { CustomersPage } from '@/components/customers/customers-page';
import { CUSTOMERS_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface CustomersRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CustomersRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Customers' });
  return { title: t('metaTitle') };
}

export default function CustomersRoute({ params }: CustomersRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard: the API answers 403 to an OPERATOR anyway.
  return (
    <RequireRole roles={CUSTOMERS_ROLES}>
      <CustomersPage />
    </RequireRole>
  );
}
