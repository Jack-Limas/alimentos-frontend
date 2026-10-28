import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { PerformanceLab } from '@/components/lab/performance-lab';
import { LAB_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface LabRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LabRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Lab' });
  return { title: t('metaTitle') };
}

export default function LabRoute({ params }: LabRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard only: the lab uses synthetic data and calls no ADMIN endpoint.
  return (
    <RequireRole roles={LAB_ROLES}>
      <PerformanceLab />
    </RequireRole>
  );
}
