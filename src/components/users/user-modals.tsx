'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass, selectClass } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { ROLES } from '@/features/auth/types';
import { useCreateUser, useResetPassword, useUpdateUser } from '@/features/users/api';
import { generateTemporaryPassword, checkPassword } from '@/features/users/password-policy';
import type { ManagedUser } from '@/features/users/types';
import { mapUserError, type UserErrorView } from '@/features/users/user-errors';
import {
  validateNewUser,
  validateUserEdit,
  type UserFormErrors,
  type UserFormValues,
} from '@/features/users/user-form';
import { TemporaryPasswordField, UserErrorBanner } from './user-bits';

function UserForm({
  user,
  canChangeRole,
  onClose,
}: {
  user?: ManagedUser;
  canChangeRole: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('Users.form');
  const fieldErrors = useTranslations('Users.fieldErrors');
  const roles = useTranslations('Auth.roles');
  const forms = useTranslations('Forms');
  const toast = useToast();
  const create = useCreateUser();
  const update = useUpdateUser();
  // A new user starts with a generated temporary password, ready to copy.
  const [values, setValues] = useState<UserFormValues>(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'OPERATOR',
    temporaryPassword: user ? '' : generateTemporaryPassword(),
  }));
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [failure, setFailure] = useState<UserErrorView | null>(null);
  const pending = create.isPending || update.isPending;
  const message = (field: keyof UserFormValues) => {
    const key = errors[field];
    return key ? fieldErrors(key) : undefined;
  };

  const set = (field: keyof UserFormValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    try {
      if (user) {
        const result = validateUserEdit(values, user);
        if (!result.ok) {
          setErrors(result.errors);
          return;
        }
        if (Object.keys(result.patch).length === 0) {
          toast.show(t('nothingToChange'));
          onClose();
          return;
        }
        const saved = await update.mutateAsync({ id: user.id, patch: result.patch });
        toast.show(t('updated', { name: saved.name }));
      } else {
        const result = validateNewUser(values);
        if (!result.ok) {
          setErrors(result.errors);
          return;
        }
        const created = await create.mutateAsync(result.data);
        toast.show(t('created', { name: created.name }));
      }
      onClose();
    } catch (error) {
      setFailure(mapUserError(error));
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      <Field id="user-name" label={t('name')} error={message('name')}>
        <input
          {...fieldAria('user-name', message('name'))}
          value={values.name}
          maxLength={120}
          autoComplete="off"
          onChange={(event) => set('name')(event.target.value)}
          className={inputClass}
        />
      </Field>
      {user ? null : (
        <Field id="user-email" label={t('email')} error={message('email')}>
          <input
            {...fieldAria('user-email', message('email'))}
            type="email"
            value={values.email}
            maxLength={254}
            autoComplete="off"
            onChange={(event) => set('email')(event.target.value)}
            className={inputClass}
          />
        </Field>
      )}
      <Field
        id="user-role"
        label={t('role')}
        error={message('role')}
        hint={canChangeRole ? undefined : t('selfRoleHint')}
      >
        <select
          {...fieldAria(
            'user-role',
            message('role'),
            canChangeRole ? undefined : t('selfRoleHint'),
          )}
          value={values.role}
          disabled={!canChangeRole}
          onChange={(event) => set('role')(event.target.value)}
          className={selectClass}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {roles(role)}
            </option>
          ))}
        </select>
      </Field>
      {user ? null : (
        <TemporaryPasswordField
          id="user-temporary-password"
          value={values.temporaryPassword}
          onChange={set('temporaryPassword')}
          error={message('temporaryPassword')}
        />
      )}

      {failure ? <UserErrorBanner error={failure} /> : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? forms('saving') : user ? t('save') : t('create')}
        </Button>
      </div>
    </form>
  );
}

/** Create (no `user`) or edit a user's name and role. */
export function UserFormModal({
  open,
  onClose,
  user,
  canChangeRole = true,
}: {
  open: boolean;
  onClose: () => void;
  user?: ManagedUser;
  canChangeRole?: boolean;
}) {
  const t = useTranslations('Users.form');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? t('editTitle', { name: user.name }) : t('createTitle')}
      description={user ? t('editDescription') : t('createDescription')}
    >
      {open ? (
        <UserForm
          key={user?.id ?? 'new'}
          user={user}
          canChangeRole={canChangeRole}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function ResetPasswordForm({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const t = useTranslations('Users.reset');
  const fieldErrors = useTranslations('Users.fieldErrors');
  const forms = useTranslations('Forms');
  const toast = useToast();
  const reset = useResetPassword();
  const [password, setPassword] = useState(() => generateTemporaryPassword());
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<UserErrorView | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const problem = checkPassword(password);
    if (problem) {
      setError(fieldErrors(problem));
      return;
    }
    try {
      await reset.mutateAsync({ id: user.id, temporaryPassword: password });
      toast.show(t('done', { name: user.name }));
      onClose();
    } catch (cause) {
      setFailure(mapUserError(cause));
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
      <TemporaryPasswordField
        id="reset-temporary-password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setError(undefined);
        }}
        error={error}
      />
      {failure ? <UserErrorBanner error={failure} /> : null}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button type="submit" variant="lagoon" disabled={reset.isPending}>
          {reset.isPending ? forms('saving') : t('confirm')}
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordModal({
  user,
  onClose,
}: {
  user: ManagedUser | null;
  onClose: () => void;
}) {
  const t = useTranslations('Users.reset');
  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title={user ? t('title', { name: user.name }) : ''}
      description={t('description')}
    >
      {user ? <ResetPasswordForm key={user.id} user={user} onClose={onClose} /> : null}
    </Modal>
  );
}

/** "Deactivate X?": ends their sessions, so it always asks first. */
export function ConfirmDeactivateModal({
  user,
  pending,
  failure,
  onConfirm,
  onClose,
}: {
  user: ManagedUser | null;
  pending: boolean;
  failure: UserErrorView | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Users.confirmDeactivate');
  const forms = useTranslations('Forms');
  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title={user ? t('title', { name: user.name }) : ''}
    >
      <p className="text-sm">{t('body')}</p>
      {failure ? (
        <div className="mt-4">
          <UserErrorBanner error={failure} />
        </div>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {forms('cancel')}
        </Button>
        <Button variant="danger" disabled={pending} onClick={onConfirm}>
          {pending ? forms('saving') : t('confirm')}
        </Button>
      </div>
    </Modal>
  );
}
