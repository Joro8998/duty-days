// Month-end forms reminder. Paydays are every 2 weeks on Fridays. A month's forms are due the
// Sunday before the first payday of the following month. Pure — no database here.

import {
  addDays,
  addMonths,
  datesInMonth,
  daysBetween,
  monthName,
  monthOf,
  shortDate,
} from './dates';

export const PAYDAY_INTERVAL_DAYS = 14;
/** Friday payday → the Sunday before it. */
export const DUE_DAYS_BEFORE_PAYDAY = 5;
/** Banner starts this many days before the due date. */
export const REMINDER_LEAD_DAYS = 5;

export function isPayday(knownPayday: string, date: string): boolean {
  const days = daysBetween(knownPayday, date);
  return ((days % PAYDAY_INTERVAL_DAYS) + PAYDAY_INTERVAL_DAYS) % PAYDAY_INTERVAL_DAYS === 0;
}

export function firstPaydayOfMonth(knownPayday: string, month: string): string {
  // Every month has 28+ days, so a 14-day cycle always lands in it.
  return datesInMonth(month).find((d) => isPayday(knownPayday, d))!;
}

/** When a month's forms are due, and the payday they're for. */
export function formsDue(knownPayday: string, month: string): { payday: string; dueDate: string } {
  const payday = firstPaydayOfMonth(knownPayday, addMonths(month, 1));
  return { payday, dueDate: addDays(payday, -DUE_DAYS_BEFORE_PAYDAY) };
}

export interface FormsReminder {
  /** The month whose forms are due, 'YYYY-MM'. */
  month: string;
  dueDate: string;
  payday: string;
  /** Negative once the due date has passed. */
  daysLeft: number;
}

/**
 * The reminder to show today, if any: from 5 days before the due date until that payday,
 * unless the month's forms were already sent.
 */
export function formsReminder(
  knownPayday: string,
  todayDate: string,
  sentMonths: ReadonlySet<string>,
): FormsReminder | null {
  const current = monthOf(todayDate);
  for (const month of [addMonths(current, -1), current]) {
    if (sentMonths.has(month)) continue;
    const { payday, dueDate } = formsDue(knownPayday, month);
    const daysLeft = daysBetween(todayDate, dueDate);
    if (daysLeft <= REMINDER_LEAD_DAYS && todayDate <= payday) {
      return { month, dueDate, payday, daysLeft };
    }
  }
  return null;
}

/** 'October forms are due Sunday, Nov 1 (in 3 days).' */
export function formsReminderText(r: FormsReminder): string {
  const forms = `${monthName(r.month)} forms`;
  const due = `Sunday, ${shortDate(r.dueDate)}`;
  if (r.daysLeft < 0) return `${forms} were due ${due}.`;
  if (r.daysLeft === 0) return `${forms} are due today.`;
  if (r.daysLeft === 1) return `${forms} are due tomorrow (${due}).`;
  return `${forms} are due ${due} (in ${r.daysLeft} days).`;
}
