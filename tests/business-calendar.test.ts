import { describe, expect, it } from 'vitest';
import {
  businessDayBounds,
  businessToday,
  calendarDateToUtc,
  daysBetween,
  isCalendarDate,
} from '@/lib/dates';

describe('business calendar', () => {
  it('uses the Bogota date around midnight', () => {
    expect(businessToday(new Date('2026-10-27T04:59:00Z'))).toBe('2026-10-26');
    expect(businessToday(new Date('2026-10-27T05:00:00Z'))).toBe('2026-10-27');
  });

  it('reads calendar dates as midnight UTC so formatting in UTC keeps the day', () => {
    const date = calendarDateToUtc('2026-10-29');
    expect(date.toISOString()).toBe('2026-10-29T00:00:00.000Z');
    expect(new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric' }).format(date)).toBe(
      '29',
    );
  });

  it('counts whole days across months', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3);
  });

  it('rejects malformed and impossible dates', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('26-10-2026')).toBe(false);
    expect(isCalendarDate('2026-10-26')).toBe(true);
  });

  it('turns a business day into UTC bounds (Bogota is UTC-5)', () => {
    expect(businessDayBounds('2026-10-26')).toEqual({
      start: '2026-10-26T05:00:00.000Z',
      end: '2026-10-27T04:59:59.999Z',
    });
  });
});
