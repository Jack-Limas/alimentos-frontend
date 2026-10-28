'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { RoleBadge } from '@/components/auth';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icons';
import type { AuthUser } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import { Link } from '@/i18n/navigation';
import { useAvatar, type AvatarSaveError } from '@/features/profile/use-avatar';

const itemClass =
  'flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-surface-muted';

/** Account disclosure menu: name, translated role, link to the dashboard and logout. */
export function UserMenu({ user }: { user: AuthUser }) {
  const t = useTranslations('Auth.userMenu');
  const profile = useTranslations('Profile');
  const { logout } = useAuth();
  const { photo, save, remove } = useAvatar(user.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<AvatarSaveError | null>(null);
  const [open, setOpen] = useState(false);
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

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError(await save(file));
  }

  function handleLogout() {
    setOpen(false);
    // The session ends at once in every tab (this menu unmounts); inside the
    // private area, RequireAuth then sends the user to the login with ?next=.
    void logout();
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
        className="inline-flex size-10 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
      >
        <Avatar userId={user.id} name={user.name} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-12 z-50 w-64 rounded-card border border-border bg-surface p-2 shadow-card"
      >
        <div className="border-b border-border px-3 pb-3 pt-2">
          <div className="mb-3 flex items-center gap-3">
            <Avatar userId={user.id} name={user.name} size="lg" />
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <Icon name="camera" className="size-4" />
                {photo ? profile('changePhoto') : profile('addPhoto')}
              </button>
              {photo ? (
                <button
                  type="button"
                  onClick={() => {
                    remove();
                    setPhotoError(null);
                  }}
                  className="text-xs font-semibold text-muted underline-offset-4 hover:text-critical-700 hover:underline dark:hover:text-critical-300"
                >
                  {profile('removePhoto')}
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handlePhoto(event)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>
          {photoError ? (
            <p
              role="alert"
              className="mb-2 text-xs font-semibold text-critical-700 dark:text-critical-300"
            >
              {profile(`errors.${photoError}`)}
            </p>
          ) : (
            <p className="mb-2 text-[0.7rem] text-muted">{profile('photoHint')}</p>
          )}
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
            onClick={handleLogout}
            className={`${itemClass} text-critical-700 dark:text-critical-300`}
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
