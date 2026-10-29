import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { MetricsPage } from '@/components/metrics/metrics-page';
import { METRICS_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface MetricsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MetricsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Metrics' });
  return { title: t('metaTitle') };
}

export default function MetricsRoute({ params }: MetricsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard: an OPERATOR sees the "no permission" notice; the API answers 403 anyway.
  return (
    <RequireRole roles={METRICS_ROLES}>
      <MetricsPage />
    </RequireRole>
  );
}
