// COPY of alimentos-backend src/modules/inventory/domain/calendar.ts (subset) (no shared code).
/** Calendar date "YYYY-MM-DD", with no time and no zone (contract, section 3). */
export type CalendarDate = string;

const DAY_MS = 86_400_000;

function toUtcMs(date: CalendarDate): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}
