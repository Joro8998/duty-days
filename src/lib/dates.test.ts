import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateRangeLabel,
  datesInMonth,
  eachDate,
  isValidDate,
  longDate,
  monthLabel,
  monthOf,
  today,
  usDate,
  weekday,
  weekdayName,
} from './dates';

describe('addDays', () => {
  it('crosses month ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('crosses year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles February and leap years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('does not shift across US daylight saving changes', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
});

describe('eachDate', () => {
  it('is inclusive on both ends', () => {
    expect(eachDate('2026-09-07', '2026-09-14')).toHaveLength(8);
    expect(eachDate('2026-09-27', '2026-09-27')).toEqual(['2026-09-27']);
  });

  it('crosses months', () => {
    expect(eachDate('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });
});

describe('month helpers', () => {
  it('monthOf / addMonths', () => {
    expect(monthOf('2026-09-07')).toBe('2026-09');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('datesInMonth', () => {
    expect(datesInMonth('2026-09')).toHaveLength(30);
    expect(datesInMonth('2026-02')).toHaveLength(28);
    expect(datesInMonth('2028-02')).toHaveLength(29);
    expect(datesInMonth('2026-10').at(-1)).toBe('2026-10-31');
  });

  it('monthLabel', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
  });
});

describe('weekday', () => {
  it('matches the calendar in America/New_York', () => {
    expect(weekday('2026-09-07')).toBe(1); // Monday
    expect(weekdayName('2026-09-07')).toBe('Monday');
    expect(weekdayName('2026-11-01')).toBe('Sunday'); // DST ends
    expect(weekdayName('2027-01-01')).toBe('Friday');
  });
});

describe('today', () => {
  it('uses the local date, not UTC', () => {
    // 11:30 PM in Florida is already the next day in UTC.
    expect(today(new Date('2026-09-07T23:30:00-04:00'))).toBe('2026-09-07');
  });
});

describe('validation and labels', () => {
  it('isValidDate', () => {
    expect(isValidDate('2026-09-07')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-9-7')).toBe(false);
  });

  it('usDate / longDate', () => {
    expect(usDate('2026-09-07')).toBe('09/07/2026');
    expect(longDate('2026-10-06')).toBe('October 6, 2026');
  });

  it('dateRangeLabel', () => {
    expect(dateRangeLabel('2026-10-01', '2026-10-01')).toBe('Oct 1');
    expect(dateRangeLabel('2026-10-01', '2026-10-02')).toBe('Oct 1–2');
    expect(dateRangeLabel('2026-09-28', '2026-10-02')).toBe('Sep 28 – Oct 2');
  });
});
