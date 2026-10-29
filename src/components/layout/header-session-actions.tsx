'use client';

import { useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { Link } from '@/i18n/navigation';
import { UserMenu } from './user-menu';

const pillClass = `whitespace-nowrap max-sm:hidden ${buttonClass('primary', 'sm')}`;

/**
 * "Log in" for visitors; "Go to dashboard" and the user menu once there is a
 * session. While the session is still being checked the visitor link is
 * shown: on a cold backend (Render's free plan) the check can take tens of
 * seconds and a grey placeholder looked broken.
 */
export function HeaderSessionActions() {
  const t = useTranslations('Header');
  const { status, user } = useAuth();

  if (status === 'authenticated' && user !== null) {
    return (
      <>
        <Link href="/app" className={pillClass}>
          {t('goToPanel')}
        </Link>
        <UserMenu user={user} />
      </>
    );
  }

  return (
    <Link href="/login" className={pillClass}>
      {t('login')}
    </Link>
  );
}
