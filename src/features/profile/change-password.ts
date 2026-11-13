import { checkPassword, type PasswordErrorKey } from '@/features/users/password-policy';

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordErrorKey = PasswordErrorKey | 'mismatch' | 'sameAsCurrent';

export type ChangePasswordErrors = Partial<
  Record<keyof ChangePasswordValues, ChangePasswordErrorKey>
>;

/** Same policy as the server, plus the confirmation and "not the same as before". */
export function validateChangePassword(
  values: ChangePasswordValues,
):
  | { ok: true; data: { currentPassword: string; newPassword: string } }
  | { ok: false; errors: ChangePasswordErrors } {
  const errors: ChangePasswordErrors = {};
  if (values.currentPassword === '') errors.currentPassword = 'required';
  const policy = checkPassword(values.newPassword);
  if (policy) errors.newPassword = policy;
  else if (values.newPassword === values.currentPassword) errors.newPassword = 'sameAsCurrent';
  if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'mismatch';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { currentPassword: values.currentPassword, newPassword: values.newPassword },
  };
}
