import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense, use } from 'react';
import { PrivateAreaSkeleton } from '@/components/auth';
import { MovementsPage } from '@/components/movements/movements-page';
import { MOVEMENTS_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface MovementsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: MovementsRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Movements' });
  return { title: t('metaTitle') };
}

export default function MovementsRoute({ params }: MovementsRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard: an OPERATOR sees the "no permission" notice; the API answers 403 anyway.
  return (
    <RequireRole roles={MOVEMENTS_ROLES}>
      <Suspense fallback={<PrivateAreaSkeleton />}>
        <MovementsPage />
      </Suspense>
    </RequireRole>
  );
}
