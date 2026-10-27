/** Business time zone of the distribution center (same as the backend APP_TIMEZONE). */
export const BUSINESS_TIME_ZONE = 'America/Bogota';

/** Calendar date "YYYY-MM-DD" from the API (expiryDate, dueDate): no time, no zone. */
export type CalendarDate = string;

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * A calendar date as a Date at midnight UTC. Format it with `timeZone: 'UTC'`:
 * formatting it in Bogota would show the previous day.
 */
export function calendarDateToUtc(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Today's business date in `timeZone` (at 23:30 in Bogota it is still Bogota's date). */
export function businessToday(now: Date = new Date(), timeZone = BUSINESS_TIME_ZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((calendarDateToUtc(to).getTime() - calendarDateToUtc(from).getTime()) / DAY_MS);
}

/** Bogota is UTC-5 all year (no daylight saving time). */
const BOGOTA_OFFSET = '-05:00';

/** Start and end of a business day as ISO instants, for API `from`/`to` filters. */
export function businessDayBounds(date: CalendarDate): { start: string; end: string } {
  return {
    start: new Date(`${date}T00:00:00.000${BOGOTA_OFFSET}`).toISOString(),
    end: new Date(`${date}T23:59:59.999${BOGOTA_OFFSET}`).toISOString(),
  };
}
