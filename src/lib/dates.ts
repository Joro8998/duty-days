// Date helpers that work on 'YYYY-MM-DD' strings.
// Never use `new Date('YYYY-MM-DD')` for logic: it parses as UTC and can land on the previous
// local day. Internally these helpers only use Date.UTC + getUTC*, so the device time zone
// never matters.

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YM_RE = /^(\d{4})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parse(date: string): { y: number; m: number; d: number } {
  const match = YMD_RE.exec(date);
  if (!match) throw new Error(`Invalid date "${date}" (expected YYYY-MM-DD)`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function parseMonth(month: string): { y: number; m: number } {
  const match = YM_RE.exec(month);
  if (!match) throw new Error(`Invalid month "${month}" (expected YYYY-MM)`);
  return { y: Number(match[1]), m: Number(match[2]) };
}

function fromUtc(t: Date): string {
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** Today's date on this phone's clock and time zone. */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** True for a real calendar date in 'YYYY-MM-DD' form (rejects '2026-02-30'). */
export function isValidDate(date: string): boolean {
  if (!YMD_RE.test(date)) return false;
  const { y, m, d } = parse(date);
  return fromUtc(new Date(Date.UTC(y, m - 1, d))) === date;
}

export function addDays(date: string, days: number): string {
  const { y, m, d } = parse(date);
  return fromUtc(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Every date from start through end, inclusive. Empty if end < start. */
export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthOf(date: string): string {
  parse(date);
  return date.slice(0, 7);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: string): number {
  const { y, m, d } = parse(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function weekdayName(date: string): string {
  return WEEKDAY_NAMES[weekday(date)]!;
}

export function addMonths(month: string, n: number): string {
  const { y, m } = parseMonth(month);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}`;
}

/** Every date in a 'YYYY-MM' month. */
export function datesInMonth(month: string): string[] {
  return eachDate(`${month}-01`, addDays(`${addMonths(month, 1)}-01`, -1));
}

/** 'YYYY-MM' → 'September' */
export function monthName(month: string): string {
  return MONTH_NAMES[parseMonth(month).m - 1]!;
}

/** 'YYYY-MM' → 'September 2026' */
export function monthLabel(month: string): string {
  return `${monthName(month)} ${parseMonth(month).y}`;
}

/** 'YYYY-MM-DD' → 'Sep 28' */
export function shortDate(date: string): string {
  const { m, d } = parse(date);
  return `${MONTH_NAMES[m - 1]!.slice(0, 3)} ${d}`;
}

/** 'YYYY-MM-DD' → '09/28/2026' */
export function usDate(date: string): string {
  const { y, m, d } = parse(date);
  return `${pad2(m)}/${pad2(d)}/${y}`;
}

/** 'YYYY-MM-DD' → 'October 6, 2026' */
export function longDate(date: string): string {
  const { y, m, d } = parse(date);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

/** 'Sep 28', 'Oct 1–2', or 'Sep 28 – Oct 2' */
export function dateRangeLabel(start: string, end: string): string {
  if (start === end) return shortDate(start);
  if (monthOf(start) === monthOf(end)) return `${shortDate(start)}–${parse(end).d}`;
  return `${shortDate(start)} – ${shortDate(end)}`;
}
