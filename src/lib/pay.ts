// Pay rules (SPEC.md section 3). Pure functions only — no React, no database.
// All money is integer cents.

import {
  addMonths,
  dateRangeLabel,
  datesInMonth,
  eachDate,
  isValidDate,
  monthName,
  monthOf,
} from './dates';
import type { DayResult, DayStatus, LocType, MonthResult, Settings, Trip } from './types';

type RateSettings = Pick<Settings, 'domesticCents' | 'internationalCents'>;
type SoftDaySettings = Pick<Settings, 'hourlyRateCents' | 'multiplier' | 'softDayHours'>;

/** One date of one trip, before combining with other trips. */
export interface TripDay {
  date: string;
  loc: LocType;
  status: DayStatus;
  /** Flying on the first and last day, Layover in between. */
  defaultStatus: DayStatus;
  perDiemCents: number;
  /** True when the amount was typed in by hand. */
  isManualAmount: boolean;
  /** True for overnight days, where the Dom/Intl type can be flipped. */
  locEditable: boolean;
}

export interface SoftDayBreakdown {
  hourlyRateCents: number;
  multiplier: number;
  perHourCents: number;
  hours: number;
  perDayCents: number;
}

/** round(hourly × multiplier) to the cent first, then × hours. Each step, for printing. */
export function softDayBreakdown(s: SoftDaySettings): SoftDayBreakdown {
  // toFixed guards against float noise like 1155.7499999 before rounding.
  const perHourCents = Math.round(Number((s.hourlyRateCents * s.multiplier).toFixed(6)));
  return {
    hourlyRateCents: s.hourlyRateCents,
    multiplier: s.multiplier,
    perHourCents,
    hours: s.softDayHours,
    perDayCents: perHourCents * s.softDayHours,
  };
}

export function softDayRateCents(s: SoftDaySettings): number {
  return softDayBreakdown(s).perDayCents;
}

export interface PerDiemLine {
  days: number;
  rateCents: number;
  subtotalCents: number;
}

export interface PerDiemBreakdown {
  domestic: PerDiemLine;
  international: PerDiemLine;
  /** Difference from manual amounts, so the lines add up to the total. Usually 0. */
  adjustmentCents: number;
  totalCents: number;
}

/** The "N days × $80.00 = $X" lines under the Per Diem table. */
export function perDiemBreakdown(result: MonthResult, s: RateSettings): PerDiemBreakdown {
  const line = (days: number, rateCents: number): PerDiemLine => ({
    days,
    rateCents,
    subtotalCents: days * rateCents,
  });
  const domestic = line(result.domesticDays, s.domesticCents);
  const international = line(result.internationalDays, s.internationalCents);
  return {
    domestic,
    international,
    adjustmentCents:
      result.perDiemTotalCents - domestic.subtotalCents - international.subtotalCents,
    totalCents: result.perDiemTotalCents,
  };
}

export function locRateCents(loc: LocType, s: RateSettings): number {
  return loc === 'international' ? s.internationalCents : s.domesticCents;
}

/**
 * Every date of a trip with its type, status, and per diem.
 * - Overnight days: the type of where you slept (trip default, or a per-night flip).
 * - Return day: the previous night's type.
 * - Same-day trip: always Domestic.
 * - A manual amount always wins.
 */
export function tripDays(trip: Trip, s: RateSettings): TripDay[] {
  if (!isValidDate(trip.startDate) || !isValidDate(trip.endDate)) {
    throw new Error(`Trip ${trip.tripNumber} has an invalid date`);
  }
  if (trip.endDate < trip.startDate) {
    throw new Error(`Trip ${trip.tripNumber} returns before it starts`);
  }

  const dates = eachDate(trip.startDate, trip.endDate);
  const sameDay = dates.length === 1;
  const nightLoc = (date: string): LocType => trip.dayOverrides[date]?.loc ?? trip.defaultLoc;

  return dates.map((date, i) => {
    const isFirst = i === 0;
    const isLast = i === dates.length - 1;
    const override = trip.dayOverrides[date];

    let loc: LocType;
    if (sameDay) loc = 'domestic';
    else if (isLast) loc = nightLoc(dates[i - 1]!);
    else loc = nightLoc(date);

    const defaultStatus: DayStatus = isFirst || isLast ? 'flying' : 'layover';
    const isManualAmount = override?.amountCents !== undefined;

    return {
      date,
      loc,
      status: override?.status ?? defaultStatus,
      defaultStatus,
      perDiemCents: isManualAmount ? override!.amountCents! : locRateCents(loc, s),
      isManualAmount,
      locEditable: !isLast,
    };
  });
}

export interface TripTotals {
  days: number;
  perDiemCents: number;
  softDayCount: number;
  softDayCents: number;
}

/**
 * Totals for one trip on its own (the trip editor's live totals). Unlike calculateMonth,
 * this does not account for another trip sharing a date.
 */
export function tripTotals(trip: Trip, daysOff: string[], s: Settings): TripTotals {
  const days = tripDays(trip, s);
  const off = new Set(daysOff);
  const softDayCount = days.filter((d) => off.has(d.date)).length;
  return {
    days: days.length,
    perDiemCents: days.reduce((sum, d) => sum + d.perDiemCents, 0),
    softDayCount,
    softDayCents: softDayCount * softDayRateCents(s),
  };
}

function joinUnique(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(' / ');
}

function carryNote(trip: Trip, month: string): string | null {
  const otherParts: string[] = [];
  const dates = eachDate(trip.startDate, trip.endDate);
  const months = [...new Set(dates.map(monthOf))];
  if (months.length < 2) return null;

  for (const m of months) {
    if (m === month) continue;
    const inMonth = dates.filter((d) => monthOf(d) === m);
    const label = dateRangeLabel(inMonth[0]!, inMonth[inMonth.length - 1]!);
    otherParts.push(`${label} on ${monthName(m)} form`);
  }
  const range = dateRangeLabel(trip.startDate, trip.endDate);
  return `Trip ${trip.tripNumber} (${range}): ${otherParts.join('; ')}`;
}

/**
 * Everything for one 'YYYY-MM' month: duty days, per diem, soft days, carry notes.
 * `daysOff` may contain dates from any month; only this month's are used.
 * When two trips share a date it is paid once: a manual amount wins, otherwise the higher rate.
 */
export function calculateMonth(
  month: string,
  trips: Trip[],
  daysOff: string[],
  settings: Settings,
): MonthResult {
  const first = `${month}-01`;
  const last = datesInMonth(month).at(-1)!;
  const offSet = new Set(daysOff.filter((d) => monthOf(d) === month));
  const softRate = softDayRateCents(settings);

  const monthTrips = trips
    .filter((t) => t.startDate <= last && t.endDate >= first)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt);

  const byDate = new Map<string, { trip: Trip; day: TripDay }[]>();
  for (const trip of monthTrips) {
    for (const day of tripDays(trip, settings)) {
      if (monthOf(day.date) !== month) continue;
      const entries = byDate.get(day.date) ?? [];
      entries.push({ trip, day });
      byDate.set(day.date, entries);
    }
  }

  const days: DayResult[] = [...byDate.keys()].sort().map((date) => {
    const entries = byDate.get(date)!;
    const manual = entries.filter((e) => e.day.isManualAmount);
    const pool = manual.length > 0 ? manual : entries;
    const winner = pool.reduce((best, e) =>
      e.day.perDiemCents > best.day.perDiemCents ? e : best,
    );
    const isDayOff = offSet.has(date);

    return {
      date,
      tripIds: entries.map((e) => e.trip.id),
      paidTripId: winner.trip.id,
      tripNumber: joinUnique(entries.map((e) => e.trip.tripNumber)),
      tail: joinUnique(entries.map((e) => e.trip.tail)),
      loc: winner.day.loc,
      status: entries.some((e) => e.day.status === 'flying') ? 'flying' : 'layover',
      perDiemCents: winner.day.perDiemCents,
      isDayOff,
      softDayCents: isDayOff ? softRate : 0,
    };
  });

  const softDayCount = days.filter((d) => d.isDayOff).length;

  return {
    month,
    days,
    daysOff: [...offSet].sort(),
    perDiemTotalCents: days.reduce((sum, d) => sum + d.perDiemCents, 0),
    domesticDays: days.filter((d) => d.loc === 'domestic').length,
    internationalDays: days.filter((d) => d.loc === 'international').length,
    softDayCount,
    softDayRateCents: softRate,
    softDayTotalCents: softDayCount * softRate,
    carryNotes: monthTrips.map((t) => carryNote(t, month)).filter((n): n is string => n !== null),
  };
}

/**
 * Per diem for each trip within a month's result. A shared date counts toward the trip whose
 * rate was paid, so the trip amounts add up to the month total.
 */
export function perDiemByTrip(result: MonthResult): Map<string, number> {
  const totals = new Map<string, number>();
  for (const day of result.days) {
    totals.set(day.paidTripId, (totals.get(day.paidTripId) ?? 0) + day.perDiemCents);
  }
  return totals;
}

/** Months a trip touches, e.g. ['2026-09', '2026-10']. */
export function tripMonths(trip: Trip): string[] {
  const months: string[] = [];
  for (let m = monthOf(trip.startDate); m <= monthOf(trip.endDate); m = addMonths(m, 1)) {
    months.push(m);
  }
  return months;
}
