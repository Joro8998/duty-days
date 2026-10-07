import { monthOf } from '../lib/dates';
import { db } from './db';

/** Scheduled days off in a 'YYYY-MM' month, sorted. */
export async function daysOffForMonth(month: string): Promise<string[]> {
  return (await db.daysOff.get(month))?.dates ?? [];
}

/** Every scheduled day off in a 'YYYY' year. */
export async function daysOffForYear(year: string): Promise<string[]> {
  const months = await db.daysOff
    .where('month')
    .between(`${year}-01`, `${year}-12`, true, true)
    .toArray();
  return months.flatMap((m) => m.dates);
}

/** Marks a date as a day off, or clears it if it already is one. */
export async function toggleDayOff(date: string): Promise<void> {
  const month = monthOf(date);
  await db.transaction('rw', db.daysOff, async () => {
    const dates = new Set((await db.daysOff.get(month))?.dates ?? []);
    if (dates.has(date)) dates.delete(date);
    else dates.add(date);
    await db.daysOff.put({ month, dates: [...dates].sort() });
  });
}
