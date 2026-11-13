import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { UsersPage } from '@/components/users/users-page';
import { USERS_ROLES } from '@/features/app-shell/navigation';
import { RequireRole } from '@/features/auth/guards';
import type { Locale } from '@/i18n/routing';

interface UsersRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: UsersRouteProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Users' });
  return { title: t('metaTitle') };
}

export default function UsersRoute({ params }: UsersRouteProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  // UX guard: the API answers 403 to an OPERATOR anyway.
  return (
    <RequireRole roles={USERS_ROLES}>
      <UsersPage />
    </RequireRole>
  );
}
