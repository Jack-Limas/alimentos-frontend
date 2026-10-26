import { describe, expect, it } from 'vitest';
import { hasRole, ROLES, type AuthUser } from '@/features/auth/types';

const operator: AuthUser = { id: 'u1', email: 'o@example.com', name: 'Op', role: 'OPERATOR' };

describe('hasRole', () => {
  it('matches the user role against the allowed roles', () => {
    expect(hasRole(operator, ['OPERATOR'])).toBe(true);
    expect(hasRole(operator, ROLES)).toBe(true);
    expect(hasRole(operator, ['ADMIN'])).toBe(false);
  });

  it('is false without a user or without roles', () => {
    expect(hasRole(null, ROLES)).toBe(false);
    expect(hasRole(operator, [])).toBe(false);
  });
});
