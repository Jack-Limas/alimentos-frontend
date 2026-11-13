'use client';

import { useEffect, type ReactNode } from 'react';
import { PrivateAreaSkeleton } from '@/components/auth';
import { ToastProvider } from '@/components/ui/toast';
import { passwordChangeRedirect } from '@/features/app-shell/navigation';
import { useAuth } from '@/features/auth/use-auth';
import { usePathname, useRouter } from '@/i18n/navigation';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

/**
 * Private app frame: sidebar on desktop, bottom bar on phones, toasts for both.
 * With a temporary password the only screen is the profile (to change it): no
 * navigation, and any other path redirects there. UX only: the server answers
 * 403 PASSWORD_CHANGE_REQUIRED to every other route.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirect = user ? passwordChangeRedirect(user, pathname) : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (user === null) return null;
  if (redirect) return <PrivateAreaSkeleton />;
  const locked = user.mustChangePassword;

  return (
    <ToastProvider>
      <div data-app-shell className="bg-app-pattern">
        <div
          className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:py-8 ${locked ? '' : 'lg:grid-cols-[16rem_1fr]'}`}
        >
          {locked ? null : <Sidebar user={user} />}
          <div className="min-w-0">{children}</div>
        </div>
      </div>
      {locked ? null : <BottomNav role={user.role} />}
    </ToastProvider>
  );
}
