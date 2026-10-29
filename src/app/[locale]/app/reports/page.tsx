import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { ReportsPage } from '@/components/reports/reports-page';
import { REPORTS_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface ReportsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReportsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Reports' });
  return { title: t('metaTitle') };
}

export default function ReportsRoute({ params }: ReportsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard: an OPERATOR sees the "no permission" notice; the API answers 403 anyway.
  return (
    <RequireRole roles={REPORTS_ROLES}>
      <ReportsPage />
    </RequireRole>
  );
}
