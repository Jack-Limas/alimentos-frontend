import { businessToday, daysBetween, type CalendarDate } from '@/lib/dates';

export type DueCountdown =
  { kind: 'today' } | { kind: 'upcoming'; days: number } | { kind: 'overdue'; days: number };

/** Due within this many days (inclusive) is urgent in the UI, like ORDER_DUE_SOON. */
export const DUE_SOON_DAYS = 2;

/**
 * Countdown to a due date counted in Bogota calendar days: at 23:59 in Bogota
 * an order due "today" is still due today, even though it is already
 * tomorrow in UTC.
 */
export function dueCountdown(dueDate: CalendarDate, now: Date = new Date()): DueCountdown {
  const days = daysBetween(businessToday(now), dueDate);
  if (days === 0) return { kind: 'today' };
  return days > 0 ? { kind: 'upcoming', days } : { kind: 'overdue', days: -days };
}

export type Urgency = 'overdue' | 'today' | 'soon' | 'later';

export function urgencyOf(countdown: DueCountdown): Urgency {
  if (countdown.kind === 'overdue') return 'overdue';
  if (countdown.kind === 'today') return 'today';
  return countdown.days <= DUE_SOON_DAYS ? 'soon' : 'later';
}
