'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ForbiddenNotice, PrivateAreaSkeleton } from '@/components/auth';
import { loginPathWithNext } from './safe-next';
import { hasRole, type Role } from './types';
import { useAuth } from './use-auth';

/**
 * Client-side guard for the private area. This is UX, not security: the API
 * checks the Bearer token and the role on every request. Anonymous users are
 * sent to the login with ?next= so they come back here afterwards.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  // next/navigation keeps the locale prefix ("/es/app/..."), which ?next= expects.
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(loginPathWithNext(locale, pathname));
  }, [status, router, locale, pathname]);

  if (status !== 'authenticated') return <PrivateAreaSkeleton />;
  return children;
}

interface RequireRoleProps {
  roles: readonly Role[];
  children: ReactNode;
  /** Rendered instead of the translated "no permission" notice. */
  fallback?: ReactNode;
}

/** Renders `children` only for the given roles. The server enforces the same rule. */
export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const { user } = useAuth();

  if (user === null) return null;
  if (!hasRole(user, roles)) return fallback ?? <ForbiddenNotice />;
  return children;
}
