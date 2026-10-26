import type { LoginCredentials } from './types';

/** Same limits as the backend login schema. */
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 200;

// Deliberately loose: the server has the final word, this only catches typos early.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginFieldErrorKey =
  'emailRequired' | 'emailInvalid' | 'emailTooLong' | 'passwordRequired' | 'passwordTooLong';

export interface LoginFieldErrors {
  email?: LoginFieldErrorKey;
  password?: LoginFieldErrorKey;
}

/** Client-side checks; returns i18n keys of the Login.validation namespace. */
export function validateLoginForm({ email, password }: LoginCredentials): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) errors.email = 'emailRequired';
  else if (trimmedEmail.length > EMAIL_MAX_LENGTH) errors.email = 'emailTooLong';
  else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'emailInvalid';

  if (password.length === 0) errors.password = 'passwordRequired';
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = 'passwordTooLong';

  return errors;
}

export function hasFieldErrors(errors: LoginFieldErrors): boolean {
  return errors.email !== undefined || errors.password !== undefined;
}
