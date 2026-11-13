import { ROLES, type Role } from '@/features/auth/types';
import { checkPassword, type PasswordErrorKey } from './password-policy';
import type { NewUserInput, UserPatch } from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserFormErrorKey = PasswordErrorKey | 'invalidEmail' | 'invalidOption';

export interface UserFormValues {
  name: string;
  email: string;
  role: string;
  temporaryPassword: string;
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, UserFormErrorKey>>;

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function nameError(name: string): UserFormErrorKey | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'required';
  if (trimmed.length > 120) return 'tooLong';
  return undefined;
}

/** New user: the same rules as POST /users, so the server rarely has to say no. */
export function validateNewUser(
  values: UserFormValues,
): { ok: true; data: NewUserInput } | { ok: false; errors: UserFormErrors } {
  const errors: UserFormErrors = {};
  const email = values.email.trim().toLowerCase();
  const name = nameError(values.name);
  if (name) errors.name = name;
  if (email === '') errors.email = 'required';
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = 'invalidEmail';
  if (!isRole(values.role)) errors.role = 'invalidOption';
  const password = checkPassword(values.temporaryPassword);
  if (password) errors.temporaryPassword = password;
  if (Object.keys(errors).length > 0 || !isRole(values.role)) return { ok: false, errors };
  return {
    ok: true,
    data: {
      email,
      name: values.name.trim(),
      role: values.role,
      temporaryPassword: values.temporaryPassword,
    },
  };
}

/** Edit: only the changed fields; an empty patch means there is nothing to save. */
export function validateUserEdit(
  values: Pick<UserFormValues, 'name' | 'role'>,
  current: { name: string; role: Role },
): { ok: true; patch: UserPatch } | { ok: false; errors: UserFormErrors } {
  const name = nameError(values.name);
  if (name) return { ok: false, errors: { name } };
  if (!isRole(values.role)) return { ok: false, errors: { role: 'invalidOption' } };
  const patch: UserPatch = {};
  if (values.name.trim() !== current.name) patch.name = values.name.trim();
  if (values.role !== current.role) patch.role = values.role;
  return { ok: true, patch };
}
