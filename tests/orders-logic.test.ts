import { describe, expect, it } from 'vitest';
import type { Role } from '@/features/auth/types';
import { dueCountdown, urgencyOf } from '@/features/orders/countdown';
import {
  availableTransitions,
  checkTransition,
  flowIndex,
  nextStep,
  ORDER_TRANSITIONS,
} from '@/features/orders/state-machine';
import { mapStatusError } from '@/features/orders/status-errors';
import { ORDER_STATUSES, type OrderStatus } from '@/features/orders/types';
import { ApiError, NETWORK_ERROR_CODE } from '@/lib/api';
import en from '../messages/en.json';
import es from '../messages/es.json';

const ROLES: Role[] = ['ADMIN', 'OPERATOR'];

/** Expected outcome for every edge; anything else is NOT_ALLOWED (same table as the backend). */
const EXPECTED: Partial<Record<`${OrderStatus}->${OrderStatus}`, Record<Role, string>>> = {
  'PENDING->IN_PREPARATION': { ADMIN: 'REQUIRES_PROPOSAL', OPERATOR: 'REQUIRES_PROPOSAL' },
  'PENDING->CANCELLED': { ADMIN: 'ALLOWED', OPERATOR: 'ROLE_FORBIDDEN' },
  'IN_PREPARATION->READY_FOR_DISPATCH': { ADMIN: 'ALLOWED', OPERATOR: 'ALLOWED' },
  'IN_PREPARATION->CANCELLED': { ADMIN: 'ALLOWED', OPERATOR: 'ROLE_FORBIDDEN' },
  'READY_FOR_DISPATCH->SHIPPED': { ADMIN: 'ALLOWED', OPERATOR: 'ALLOWED' },
  'READY_FOR_DISPATCH->CANCELLED': { ADMIN: 'ALLOWED', OPERATOR: 'ROLE_FORBIDDEN' },
  'SHIPPED->DELIVERED': { ADMIN: 'ALLOWED', OPERATOR: 'ALLOWED' },
};

describe('order state machine mirror', () => {
  const cases = ORDER_STATUSES.flatMap((from) =>
    ORDER_STATUSES.flatMap((to) =>
      ROLES.map((role) => ({
        from,
        to,
        role,
        expected: EXPECTED[`${from}->${to}`]?.[role] ?? 'NOT_ALLOWED',
      })),
    ),
  );

  it.each(cases)('$from -> $to by $role is $expected', ({ from, to, role, expected }) => {
    const check = checkTransition(from, to, role);
    expect(check.allowed ? 'ALLOWED' : check.denial).toBe(expected);
  });

  it('has exactly the edges of the contract', () => {
    const edges = ORDER_STATUSES.flatMap((from) =>
      ORDER_TRANSITIONS[from].map((to) => `${from}->${to}`),
    );
    expect(edges.sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it('offers only the buttons each role can use', () => {
    expect(availableTransitions('PENDING', 'ADMIN')).toEqual(['CANCELLED']);
    expect(availableTransitions('PENDING', 'OPERATOR')).toEqual([]);
    expect(availableTransitions('IN_PREPARATION', 'ADMIN')).toEqual([
      'READY_FOR_DISPATCH',
      'CANCELLED',
    ]);
    expect(availableTransitions('READY_FOR_DISPATCH', 'OPERATOR')).toEqual(['SHIPPED']);
    expect(availableTransitions('DELIVERED', 'ADMIN')).toEqual([]);
  });

  it('gives the next forward step of a mission', () => {
    expect(nextStep('IN_PREPARATION', 'OPERATOR')).toBe('READY_FOR_DISPATCH');
    expect(nextStep('READY_FOR_DISPATCH', 'OPERATOR')).toBe('SHIPPED');
    expect(nextStep('SHIPPED', 'OPERATOR')).toBe('DELIVERED');
    expect(nextStep('PENDING', 'ADMIN')).toBeNull();
    expect(nextStep('DELIVERED', 'OPERATOR')).toBeNull();
  });

  it('places statuses on the happy path, cancelled outside it', () => {
    expect(flowIndex('PENDING')).toBe(0);
    expect(flowIndex('DELIVERED')).toBe(4);
    expect(flowIndex('CANCELLED')).toBe(-1);
  });
});

describe('dueCountdown in Bogota', () => {
  it('is still "today" at 23:59 in Bogota although UTC is already tomorrow', () => {
    expect(dueCountdown('2026-10-28', new Date('2026-10-29T04:59:00Z'))).toEqual({ kind: 'today' });
  });

  it('turns overdue by one day at 00:00 in Bogota', () => {
    expect(dueCountdown('2026-10-28', new Date('2026-10-29T05:00:00Z'))).toEqual({
      kind: 'overdue',
      days: 1,
    });
  });

  it('counts calendar days ahead', () => {
    const noon = new Date('2026-10-28T17:00:00Z');
    expect(dueCountdown('2026-10-30', noon)).toEqual({ kind: 'upcoming', days: 2 });
    expect(urgencyOf(dueCountdown('2026-10-30', noon))).toBe('soon');
    expect(urgencyOf(dueCountdown('2026-10-31', noon))).toBe('later');
    expect(urgencyOf(dueCountdown('2026-10-27', noon))).toBe('overdue');
  });
});

describe('mapStatusError', () => {
  const conflict = (reason: string) =>
    new ApiError(409, 'INVALID_STATUS_TRANSITION', 'x', { from: 'PENDING', to: 'SHIPPED', reason });

  it.each([
    [conflict('REQUIRES_PROPOSAL'), 'requiresProposal'],
    [conflict('NOT_ALLOWED'), 'notAllowed'],
    [conflict('STATUS_CHANGED'), 'statusChanged'],
    [conflict('SOMETHING_NEW'), 'notAllowed'],
    [new ApiError(403, 'FORBIDDEN', 'x'), 'forbidden'],
    [new ApiError(404, 'NOT_FOUND', 'x'), 'notFound'],
    [new ApiError(0, NETWORK_ERROR_CODE, 'x'), 'network'],
    [new Error('boom'), 'unexpected'],
  ])('maps %o to %s', (error, key) => {
    expect(mapStatusError(error)).toBe(key);
  });

  it.each(Object.entries({ es, en }))('%s has a message for every status error', (_l, messages) => {
    for (const key of [
      'requiresProposal',
      'notAllowed',
      'statusChanged',
      'forbidden',
      'notFound',
      'network',
      'unexpected',
    ]) {
      expect(
        messages.Orders.statusErrors[key as keyof typeof messages.Orders.statusErrors],
        key,
      ).toBeTruthy();
    }
  });
});
