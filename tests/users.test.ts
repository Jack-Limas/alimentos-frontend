import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  mobileNavFor,
  navItemsFor,
  passwordChangeRedirect,
  PROFILE_PATH,
} from '@/features/app-shell/navigation';
import { validateChangePassword } from '@/features/profile/change-password';
import {
  checkPassword,
  generateTemporaryPassword,
  PASSWORD_MAX_LENGTH,
} from '@/features/users/password-policy';
import { userRowActions } from '@/features/users/permissions';
import { usersQuery } from '@/features/users/query';
import type { ManagedUser } from '@/features/users/types';
import { mapUserError, USER_ERROR_KINDS } from '@/features/users/user-errors';
import { validateNewUser, validateUserEdit } from '@/features/users/user-form';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import en from '../messages/en.json';
import es from '../messages/es.json';

const row = (overrides: Partial<ManagedUser> = {}): ManagedUser => ({
  id: 'u2',
  email: 'op@example.com',
  name: 'Operador',
  role: 'OPERATOR',
  active: true,
  isProtected: false,
  mustChangePassword: false,
  createdAt: '2026-11-13T15:00:00.000Z',
  ...overrides,
});

describe('new error codes → i18n', () => {
  it.each([
    ['PROTECTED_ACCOUNT', 403, 'protectedAccount'],
    ['USER_LIMIT_REACHED', 409, 'userLimitReached'],
    ['DUPLICATE', 409, 'duplicateEmail'],
    ['SELF_LOCKOUT', 409, 'selfLockout'],
    ['LAST_ADMIN', 409, 'lastAdmin'],
    ['INVALID_CREDENTIALS', 401, 'wrongCurrentPassword'],
    ['TOO_MANY_REQUESTS', 429, 'tooManyAttempts'],
    ['VALIDATION_ERROR', 400, 'invalid'],
    ['FORBIDDEN', 403, 'forbidden'],
    ['NOT_FOUND', 404, 'notFound'],
    ['UNAUTHENTICATED', 401, 'sessionExpired'],
    ['SOMETHING_NEW', 500, 'unexpected'],
  ])('%s maps to %s', (code, status, kind) => {
    expect(mapUserError(new ApiError(status, code, 'server text')).kind).toBe(kind);
  });

  it('keeps the limit and the wait the server sends', () => {
    expect(mapUserError(new ApiError(409, 'USER_LIMIT_REACHED', 'x', { limit: 30 }))).toEqual({
      kind: 'userLimitReached',
      limit: 30,
    });
    expect(mapUserError(new ApiError(429, 'TOO_MANY_REQUESTS', 'x', {}, 120))).toEqual({
      kind: 'tooManyAttempts',
      retryAfterSeconds: 120,
    });
    expect(mapUserError(new ApiError(0, NETWORK_ERROR_CODE, 'x')).kind).toBe('network');
    expect(mapUserError(new Error('boom')).kind).toBe('unexpected');
  });

  it.each(Object.entries({ es, en }))(
    '%s translates every kind, the same keys in both',
    (_l, m) => {
      for (const kind of USER_ERROR_KINDS) expect(m.Users.errors[kind]).toBeTruthy();
      expect(m.Users.errors.userLimitReached).toContain('{limit, number}');
      expect(m.Users.errors.tooManyAttempts).toContain('{seconds, number}');
    },
  );

  it('has the same Users and Profile keys in es and en', () => {
    const keys = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
        : [prefix];
    expect(keys(es.Users)).toEqual(keys(en.Users));
    expect(keys(es.Profile)).toEqual(keys(en.Profile));
    expect(es.Profile.demoNotice.description).toBe(
      'Esta es una cuenta de demostración; su contraseña no se puede cambiar.',
    );
  });
});

describe('temporary password generator', () => {
  it('is 14 characters, readable, with letters and numbers, and passes the policy', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(14);
      expect(password).toMatch(/^[A-Z][a-z]{3}-\d{4}-[A-Z][a-z]{3}$/);
      expect(password).not.toMatch(/[0OoIl1Ss5Zz2B8]/);
      expect(checkPassword(password)).toBeNull();
    }
  });

  it('uses the injected random source (Web Crypto in the browser)', () => {
    const zeros = (array: Uint32Array) => array.fill(0);
    expect(generateTemporaryPassword(zeros)).toBe('Aaaa-3333-Aaaa');
  });

  it('applies the server policy: 10 to 72 characters with letters and numbers', () => {
    expect(checkPassword('')).toBe('required');
    expect(checkPassword('Corta-123')).toBe('tooShort');
    expect(checkPassword(`a1${'x'.repeat(PASSWORD_MAX_LENGTH)}`)).toBe('tooLong');
    expect(checkPassword('1234567890')).toBe('needsLetter');
    expect(checkPassword('solo-letras')).toBe('needsNumber');
    expect(checkPassword('Ñandú-2026x')).toBeNull();
  });
});

describe('row actions', () => {
  const me = { id: 'me' };

  it('a protected account shows no actions', () => {
    expect(userRowActions(row({ isProtected: true }), me)).toEqual({
      edit: false,
      changeRole: false,
      toggleActive: false,
      resetPassword: false,
    });
  });

  it('my own row: only the name (no deactivate, no role, no reset)', () => {
    expect(userRowActions(row({ id: 'me', role: 'ADMIN' }), me)).toEqual({
      edit: true,
      changeRole: false,
      toggleActive: false,
      resetPassword: false,
    });
  });

  it('anyone else: everything', () => {
    expect(Object.values(userRowActions(row(), me)).every(Boolean)).toBe(true);
  });
});

describe('mustChangePassword guard', () => {
  it('sends a user with a temporary password to the profile, from anywhere else', () => {
    expect(passwordChangeRedirect({ mustChangePassword: true }, '/app/missions')).toBe(
      PROFILE_PATH,
    );
    expect(passwordChangeRedirect({ mustChangePassword: true }, '/app')).toBe('/app/profile');
    expect(passwordChangeRedirect({ mustChangePassword: true }, PROFILE_PATH)).toBeNull();
  });

  it('leaves everyone else where they are', () => {
    expect(passwordChangeRedirect({ mustChangePassword: false }, '/app/missions')).toBeNull();
  });
});

describe('Users in the navigation', () => {
  it('an OPERATOR does not see Users and its path is guarded', () => {
    expect(navItemsFor('OPERATOR').map((i) => i.key)).not.toContain('users');
    expect(mobileNavFor('OPERATOR').map((i) => i.key)).not.toContain('users');
    expect(canAccessPath('/app/users', 'OPERATOR')).toBe(false);
  });

  it('an ADMIN has it in the sidebar and the phone bar; the profile is for everyone', () => {
    expect(navItemsFor('ADMIN').map((i) => i.key)).toContain('users');
    expect(mobileNavFor('ADMIN').map((i) => i.key)).toContain('users');
    expect(canAccessPath('/app/users', 'ADMIN')).toBe(true);
    expect(canAccessPath('/app/profile', 'OPERATOR')).toBe(true);
  });
});

describe('forms', () => {
  it('validates a new user like the server and normalizes the email', () => {
    expect(
      validateNewUser({
        name: '  Ana ',
        email: ' Ana@Example.COM ',
        role: 'OPERATOR',
        temporaryPassword: 'Kmrt-4796-Pxqa',
      }),
    ).toEqual({
      ok: true,
      data: {
        name: 'Ana',
        email: 'ana@example.com',
        role: 'OPERATOR',
        temporaryPassword: 'Kmrt-4796-Pxqa',
      },
    });
    expect(
      validateNewUser({ name: '', email: 'nope', role: 'ROOT', temporaryPassword: 'abc' }),
    ).toEqual({
      ok: false,
      errors: {
        name: 'required',
        email: 'invalidEmail',
        role: 'invalidOption',
        temporaryPassword: 'tooShort',
      },
    });
  });

  it('an edit sends only what changed', () => {
    const current = { name: 'Ana', role: 'OPERATOR' as const };
    expect(validateUserEdit({ name: 'Ana', role: 'ADMIN' }, current)).toEqual({
      ok: true,
      patch: { role: 'ADMIN' },
    });
    expect(validateUserEdit({ name: ' Ana ', role: 'OPERATOR' }, current)).toEqual({
      ok: true,
      patch: {},
    });
  });

  it('change password: policy, confirmation and not the same as before', () => {
    expect(
      validateChangePassword({
        currentPassword: '',
        newPassword: 'corta',
        confirmPassword: 'otra',
      }),
    ).toEqual({
      ok: false,
      errors: { currentPassword: 'required', newPassword: 'tooShort', confirmPassword: 'mismatch' },
    });
    expect(
      validateChangePassword({
        currentPassword: 'Kmrt-4796-Pxqa',
        newPassword: 'Kmrt-4796-Pxqa',
        confirmPassword: 'Kmrt-4796-Pxqa',
      }),
    ).toMatchObject({ ok: false, errors: { newPassword: 'sameAsCurrent' } });
    expect(
      validateChangePassword({
        currentPassword: 'Kmrt-4796-Pxqa',
        newPassword: 'Mi-Clave-2026',
        confirmPassword: 'Mi-Clave-2026',
      }),
    ).toEqual({
      ok: true,
      data: { currentPassword: 'Kmrt-4796-Pxqa', newPassword: 'Mi-Clave-2026' },
    });
  });

  it('builds the list query with only the filters that are set', () => {
    expect(usersQuery({ search: '', role: '', status: 'all', page: 1 })).toBe('page=1&pageSize=20');
    expect(usersQuery({ search: 'ana', role: 'ADMIN', status: 'inactive', page: 2 })).toBe(
      'page=2&pageSize=20&search=ana&role=ADMIN&active=false',
    );
  });
});
