'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { RoleBadge } from '@/components/auth';
import { privateHome } from '@/features/auth/safe-next';
import type { AuthUser } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { Link } from '@/i18n/navigation';

/** "Ana María López" → "AM". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0] ?? '');
  return letters.join('').toUpperCase() || '?';
}

const itemClass =
  'flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-surface-muted disabled:opacity-60';

/** Account disclosure menu: name, translated role, link to the dashboard and logout. */
export function UserMenu({ user }: { user: AuthUser }) {
  const t = useTranslations('Auth.userMenu');
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setOpen(false);
    // Leaving the private area explicitly: go to the login without ?next=.
    if (pathname.startsWith(privateHome(locale))) router.replace(`/${locale}/login`);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t('open', { name: user.name })}
        title={user.name}
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-brand-100 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-200 dark:bg-brand-900/60 dark:text-brand-100 dark:hover:bg-brand-900"
      >
        <span aria-hidden="true">{initialsOf(user.name)}</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-12 z-50 w-64 rounded-card border border-border bg-surface p-2 shadow-card"
      >
        <div className="border-b border-border px-3 pb-3 pt-2">
          <p className="text-xs text-muted">{t('signedInAs')}</p>
          <p className="mt-0.5 truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-2">
            <RoleBadge role={user.role} />
          </div>
        </div>
        <div className="pt-2">
          <Link
            href="/app"
            onClick={() => {
              setOpen(false);
            }}
            className={itemClass}
          >
            {t('goToPanel')}
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className={`${itemClass} text-critical-700 dark:text-critical-300`}
          >
            {loggingOut ? t('loggingOut') : t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
