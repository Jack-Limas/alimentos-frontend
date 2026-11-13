import type { AuthUser } from '@/features/auth/types';
import type { ManagedUser } from './types';

export interface UserRowActions {
  /** Edit the name (and the role, when `changeRole`). */
  edit: boolean;
  changeRole: boolean;
  /** Activate or deactivate. */
  toggleActive: boolean;
  resetPassword: boolean;
}

const NONE: UserRowActions = {
  edit: false,
  changeRole: false,
  toggleActive: false,
  resetPassword: false,
};

/**
 * The buttons a row shows: only what the server would accept. A protected
 * (seed) account gets none (403 PROTECTED_ACCOUNT); the signed-in ADMIN can
 * only rename itself (409 SELF_LOCKOUT for the rest; its own password is
 * changed from the profile). UX only: the server checks every rule again.
 */
export function userRowActions(row: ManagedUser, me: Pick<AuthUser, 'id'>): UserRowActions {
  if (row.isProtected) return NONE;
  if (row.id === me.id) return { ...NONE, edit: true };
  return { edit: true, changeRole: true, toggleActive: true, resetPassword: true };
}
