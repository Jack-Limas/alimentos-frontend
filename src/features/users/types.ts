import type { Role } from '@/features/auth/types';

/** A user as GET/POST/PATCH /users return it (never a password hash). */
export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  /** Seed account (real or demo): the server refuses every change (403 PROTECTED_ACCOUNT). */
  isProtected: boolean;
  /** Still has the temporary password an ADMIN gave it. */
  mustChangePassword: boolean;
  /** ISO 8601 UTC. */
  createdAt: string;
}

export interface NewUserInput {
  email: string;
  name: string;
  role: Role;
  temporaryPassword: string;
}

/** PATCH /users/:id: the email never changes (it identifies the account). */
export interface UserPatch {
  name?: string;
  role?: Role;
  active?: boolean;
}

export type ActiveFilter = 'all' | 'active' | 'inactive';
