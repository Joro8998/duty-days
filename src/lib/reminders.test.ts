import { describe, expect, it } from 'vitest';
import {
  firstPaydayOfMonth,
  formsDue,
  formsReminder,
  formsReminderText,
  isPayday,
} from './reminders';

// A made-up Friday payday cycle (…Oct 2, Oct 16, Oct 30, Nov 13…). The real one is in Settings.
const PAYDAY = '2026-10-16';
const none = new Set<string>();

describe('paydays every 2 weeks', () => {
  it('counts forward and backward from the known payday', () => {
    expect(isPayday(PAYDAY, '2026-10-30')).toBe(true);
    expect(isPayday(PAYDAY, '2026-11-13')).toBe(true);
    expect(isPayday(PAYDAY, '2026-10-02')).toBe(true);
    expect(isPayday(PAYDAY, '2026-10-23')).toBe(false);
  });

  it('finds the first payday of a month', () => {
    expect(firstPaydayOfMonth(PAYDAY, '2026-11')).toBe('2026-11-13');
    expect(firstPaydayOfMonth(PAYDAY, '2026-12')).toBe('2026-12-11');
    expect(firstPaydayOfMonth(PAYDAY, '2027-10')).toBe('2027-10-01');
  });
});

describe('forms due date', () => {
  it('October forms: payday Fri Nov 13, due Sun Nov 8', () => {
    expect(formsDue(PAYDAY, '2026-10')).toEqual({ payday: '2026-11-13', dueDate: '2026-11-08' });
  });

  it('works with a known payday after the month in question', () => {
    expect(formsDue('2027-03-19', '2026-10')).toEqual({
      payday: '2026-11-13',
      dueDate: '2026-11-08',
    });
  });

  it('when next month starts with a payday, forms are due before the month ends', () => {
    // Payday Fri Oct 2 → September forms due Sun Sep 27.
    expect(formsDue(PAYDAY, '2026-09')).toEqual({ payday: '2026-10-02', dueDate: '2026-09-27' });
  });
});

describe('formsReminder', () => {
  it('starts 5 days before the due date', () => {
    expect(formsReminder(PAYDAY, '2026-11-02', none)).toBeNull();
    expect(formsReminder(PAYDAY, '2026-11-03', none)).toEqual({
      month: '2026-10',
      dueDate: '2026-11-08',
      payday: '2026-11-13',
      daysLeft: 5,
    });
  });

  it('stays (as overdue) until payday, then stops', () => {
    expect(formsReminder(PAYDAY, '2026-11-10', none)?.daysLeft).toBe(-2);
    expect(formsReminder(PAYDAY, '2026-11-13', none)?.month).toBe('2026-10');
    expect(formsReminder(PAYDAY, '2026-11-14', none)).toBeNull();
  });

  it('goes away once the month is sent', () => {
    expect(formsReminder(PAYDAY, '2026-11-05', new Set(['2026-10']))).toBeNull();
  });

  it('catches a due date inside the same month', () => {
    expect(formsReminder(PAYDAY, '2026-09-24', none)).toMatchObject({
      month: '2026-09',
      daysLeft: 3,
    });
  });
});

describe('formsReminderText', () => {
  const r = { month: '2026-10', dueDate: '2026-11-08', payday: '2026-11-13' };
  it('reads naturally', () => {
    expect(formsReminderText({ ...r, daysLeft: 3 })).toBe(
      'October forms are due Sunday, Nov 8 (in 3 days).',
    );
    expect(formsReminderText({ ...r, daysLeft: 1 })).toBe(
      'October forms are due tomorrow (Sunday, Nov 8).',
    );
    expect(formsReminderText({ ...r, daysLeft: 0 })).toBe('October forms are due today.');
    expect(formsReminderText({ ...r, daysLeft: -2 })).toBe('October forms were due Sunday, Nov 8.');
  });
});
