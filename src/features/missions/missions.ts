import { dueCountdown, type DueCountdown } from '@/features/orders/countdown';
import { flowIndex, ORDER_FLOW } from '@/features/orders/state-machine';
import { ORDER_PRIORITIES, type Order, type OrderStatus } from '@/features/orders/types';
import type { CalendarDate } from '@/lib/dates';

/** Orders the operator moves by hand: prepared, waiting for the truck, on the road. */
export const MISSION_STATUSES: readonly OrderStatus[] = [
  'IN_PREPARATION',
  'READY_FOR_DISPATCH',
  'SHIPPED',
];

export interface MissionProgress {
  /** Steps done on the happy path (PENDING = 0 … DELIVERED = 4). */
  step: number;
  total: number;
  percent: number;
}

export function missionProgress(status: OrderStatus): MissionProgress {
  const total = ORDER_FLOW.length - 1;
  const step = Math.max(0, flowIndex(status));
  return { step, total, percent: Math.round((step / total) * 100) };
}

function urgencyRank(countdown: DueCountdown): number {
  if (countdown.kind === 'overdue') return -countdown.days;
  if (countdown.kind === 'today') return 0;
  return countdown.days;
}

/** Most urgent first: overdue, due today, sooner; then higher priority; then older order. */
export function sortMissions<T extends Pick<Order, 'dueDate' | 'priority' | 'number'>>(
  orders: readonly T[],
  now: Date = new Date(),
): T[] {
  return [...orders].sort(
    (a, b) =>
      urgencyRank(dueCountdown(a.dueDate, now)) - urgencyRank(dueCountdown(b.dueDate, now)) ||
      ORDER_PRIORITIES.indexOf(b.priority) - ORDER_PRIORITIES.indexOf(a.priority) ||
      a.number - b.number,
  );
}

/** Minimal Storage, so tests can pass a fake and private mode can fail safely. */
export type CounterStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function completedKey(userId: string, day: CalendarDate): string {
  return `aiq.missions.done.${userId}.${day}`;
}

/** Missions this user completed on this business day, in this browser. */
export function readCompleted(
  storage: CounterStorage | null,
  userId: string,
  day: CalendarDate,
): number {
  try {
    const value = Number(storage?.getItem(completedKey(userId, day)) ?? '0');
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function recordCompleted(
  storage: CounterStorage | null,
  userId: string,
  day: CalendarDate,
): number {
  const next = readCompleted(storage, userId, day) + 1;
  try {
    storage?.setItem(completedKey(userId, day), String(next));
  } catch {
    // Storage full or blocked: the counter is a nicety, the delivery is already saved.
  }
  return next;
}
