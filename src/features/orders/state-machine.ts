import type { Role } from '@/features/auth/types';
import type { OrderStatus } from './types';

/**
 * Mirror of the backend state machine (contract 2). It only decides which
 * buttons to show: the server validates every change and has the last word.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> =
  Object.freeze({
    PENDING: ['IN_PREPARATION', 'CANCELLED'],
    IN_PREPARATION: ['READY_FOR_DISPATCH', 'CANCELLED'],
    READY_FOR_DISPATCH: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  });

/** The happy path, in order: what the stepper shows. */
export const ORDER_FLOW: readonly OrderStatus[] = [
  'PENDING',
  'IN_PREPARATION',
  'READY_FOR_DISPATCH',
  'SHIPPED',
  'DELIVERED',
];

export type TransitionDenial = 'NOT_ALLOWED' | 'REQUIRES_PROPOSAL' | 'ROLE_FORBIDDEN';
export type TransitionCheck = { allowed: true } | { allowed: false; denial: TransitionDenial };

/** Same order of checks as the backend: the edge first, then the role. */
export function checkTransition(from: OrderStatus, to: OrderStatus, role: Role): TransitionCheck {
  if (!ORDER_TRANSITIONS[from].includes(to)) return { allowed: false, denial: 'NOT_ALLOWED' };
  if (from === 'PENDING' && to === 'IN_PREPARATION') {
    return { allowed: false, denial: 'REQUIRES_PROPOSAL' };
  }
  if (to === 'CANCELLED' && role !== 'ADMIN') return { allowed: false, denial: 'ROLE_FORBIDDEN' };
  return { allowed: true };
}

/** Status changes the role can make by hand from `status`, forward moves first. */
export function availableTransitions(status: OrderStatus, role: Role): OrderStatus[] {
  return ORDER_TRANSITIONS[status].filter((to) => checkTransition(status, to, role).allowed);
}

/** The next step forward of the happy path, if the role can take it. */
export function nextStep(status: OrderStatus, role: Role): OrderStatus | null {
  return availableTransitions(status, role).find((to) => to !== 'CANCELLED') ?? null;
}

/** Position on the happy path (0-based), or -1 when cancelled. */
export function flowIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

export function isOpen(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'IN_PREPARATION' || status === 'READY_FOR_DISPATCH';
}
