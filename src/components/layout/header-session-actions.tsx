'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/use-auth';
import { Link } from '@/i18n/navigation';
import { UserMenu } from './user-menu';

const pillClass =
  'hidden h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover sm:inline-flex';

/** "Log in" for visitors; "Go to dashboard" and the user menu once there is a session. */
export function HeaderSessionActions() {
  const t = useTranslations('Header');
  const { status, user } = useAuth();

  if (status === 'loading') {
    // Same footprint as the button, so the header does not jump when the session resolves.
    return (
      <span
        aria-hidden="true"
        className="hidden h-10 w-32 animate-pulse rounded-full bg-surface-muted sm:inline-block"
      />
    );
  }

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
