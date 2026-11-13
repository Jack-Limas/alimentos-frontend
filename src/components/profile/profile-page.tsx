'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { PasswordField, RoleBadge } from '@/components/auth';
import { ProtectedBadge, UserErrorBanner } from '@/components/users/user-bits';
import { Avatar } from '@/components/ui/avatar';
import { Button, buttonClass } from '@/components/ui/button';
import { Field, fieldAria, inputClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import type { AuthUser } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import {
  validateChangePassword,
  type ChangePasswordErrors,
  type ChangePasswordValues,
} from '@/features/profile/change-password';
import { useChangePassword } from '@/features/users/api';
import { mapUserError, type UserErrorView } from '@/features/users/user-errors';
import { Link } from '@/i18n/navigation';

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordForm({ wasTemporary }: { wasTemporary: boolean }) {
  const t = useTranslations('Profile.password');
  const fieldErrors = useTranslations('Users.fieldErrors');
  const toast = useToast();
  const change = useChangePassword();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [failure, setFailure] = useState<UserErrorView | null>(null);
  const [done, setDone] = useState(false);

  const message = (field: keyof ChangePasswordValues) => {
    const key = errors[field];
    if (!key) return undefined;
    return key === 'mismatch' || key === 'sameAsCurrent' ? t(key) : fieldErrors(key);
  };
  const set = (field: keyof ChangePasswordValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validateChangePassword(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    try {
      await change.mutateAsync(result.data);
      setValues(EMPTY);
      setDone(true);
      toast.show(t('done'));
    } catch (error) {
      setFailure(mapUserError(error));
    }
  }

  const password = (
    field: keyof ChangePasswordValues,
    autoComplete: 'current-password' | 'new-password',
    hint?: string,
  ) => (
    <Field
      id={`profile-${field}`}
      label={t(
        field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm',
      )}
      error={message(field)}
      hint={hint}
    >
      <PasswordField
        {...fieldAria(`profile-${field}`, message(field), hint)}
        id={`profile-${field}`}
        value={values[field]}
        maxLength={field === 'currentPassword' ? 200 : 72}
        autoComplete={autoComplete}
        onChange={(event) => set(field)(event.target.value)}
        inputClassName={inputClass}
      />
    </Field>
  );

  return (
    <section className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
      <h2 className="font-display text-xl font-semibold">{t('title')}</h2>
      <p className="mt-1 text-sm text-muted">{t('description')}</p>
      <form noValidate onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
        {password('currentPassword', 'current-password')}
        {password('newPassword', 'new-password', t('newHint'))}
        {password('confirmPassword', 'new-password')}
        {failure ? <UserErrorBanner error={failure} /> : null}
        {done ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
          >
            <Icon name="check" className="size-4" />
            {t('done')}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
          {done && wasTemporary ? (
            <Link href="/app" className={buttonClass('secondary')}>
              {t('continue')}
            </Link>
          ) : null}
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? t('saving') : t('submit')}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Details({ user }: { user: AuthUser }) {
  const t = useTranslations('Profile');
  return (
    <section className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
      <h2 className="sr-only">{t('details.title')}</h2>
      <div className="flex items-center gap-4">
        <Avatar userId={user.id} name={user.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold">{user.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={user.role} />
            {user.isProtected ? <ProtectedBadge /> : null}
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('details.name')}
          </dt>
          <dd className="mt-0.5 break-words">{user.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('details.email')}
          </dt>
          <dd className="mt-0.5 break-all">{user.email}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ProfilePage() {
  const t = useTranslations('Profile');
  const { user } = useAuth();
  // Kept after the change, so the "go to the dashboard" button stays until they leave.
  const [wasTemporary] = useState(() => user?.mustChangePassword ?? false);
  if (user === null) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-700 dark:text-lagoon-300">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
      </header>

      {user.mustChangePassword ? (
        <div
          role="alert"
          className="flex gap-3 rounded-card border border-expiry-300 bg-expiry-50 p-4 text-expiry-900 dark:border-expiry-700 dark:bg-expiry-900/30 dark:text-expiry-100"
        >
          <Icon name="key" className="mt-0.5 size-5" />
          <div>
            <p className="font-semibold">{t('mustChange.title')}</p>
            <p className="mt-0.5 text-sm">{t('mustChange.description')}</p>
          </div>
        </div>
      ) : null}

      <Details user={user} />

      {user.isProtected ? (
        <section className="flex gap-3 rounded-card bg-lagoon-50 p-5 ring-1 ring-lagoon-200 dark:bg-lagoon-900/30 dark:ring-lagoon-800">
          <Icon name="lock" className="mt-0.5 size-5 text-lagoon-700 dark:text-lagoon-300" />
          <div>
            <h2 className="font-semibold">{t('demoNotice.title')}</h2>
            <p className="mt-0.5 text-sm text-muted">{t('demoNotice.description')}</p>
          </div>
        </section>
      ) : (
        <ChangePasswordForm wasTemporary={wasTemporary} />
      )}
    </div>
  );
}
