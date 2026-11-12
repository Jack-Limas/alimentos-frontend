import type { LoginCredentials } from './types';

export type DemoRole = 'admin' | 'operator';

export interface DemoAccount extends LoginCredentials {
  role: DemoRole;
}

/**
 * The PUBLIC demo accounts shown on the login page for evaluators. They come
 * only from NEXT_PUBLIC_DEMO_* (never the real accounts): the literal
 * `process.env.NEXT_PUBLIC_...` reads let Next inline them in the bundle. An
 * account with a missing email or password is left out; with none, the card
 * is not shown.
 */
export function readDemoAccounts(
  vars: Record<string, string | undefined> = {
    NEXT_PUBLIC_DEMO_ADMIN_EMAIL: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL,
    NEXT_PUBLIC_DEMO_ADMIN_PASSWORD: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD,
    NEXT_PUBLIC_DEMO_OPERATOR_EMAIL: process.env.NEXT_PUBLIC_DEMO_OPERATOR_EMAIL,
    NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD: process.env.NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD,
  },
): DemoAccount[] {
  const accounts: DemoAccount[] = [];
  for (const role of ['admin', 'operator'] as const) {
    const prefix = `NEXT_PUBLIC_DEMO_${role.toUpperCase()}`;
    const email = vars[`${prefix}_EMAIL`]?.trim() ?? '';
    const password = vars[`${prefix}_PASSWORD`] ?? '';
    if (email !== '' && password.trim() !== '') accounts.push({ role, email, password });
  }
  return accounts;
}
