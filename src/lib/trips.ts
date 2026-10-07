// Editing helpers for a trip draft. Pure: each returns a new Trip, nothing is saved here.

import { isValidDate } from './dates';
import type { DayOverride, LocType, Settings, Trip } from './types';

export function newTripDraft(
  startDate: string,
  settings: Pick<Settings, 'defaultTail'>,
  now: number = Date.now(),
): Trip {
  return {
    id: newId(),
    startDate,
    endDate: startDate,
    tripNumber: '',
    tail: settings.defaultTail,
    kind: 'charter',
    defaultLoc: 'domestic',
    dayOverrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Changes the dates, keeping return >= start. Moving the start past the return moves both. */
export function setTripDates(trip: Trip, startDate: string, endDate: string): Trip {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return trip;
  return { ...trip, startDate, endDate: endDate < startDate ? startDate : endDate };
}

/** The trip-level Dom/Intl toggle sets every night, so per-night flips are cleared. */
export function setTripLoc(trip: Trip, loc: LocType): Trip {
  return {
    ...trip,
    defaultLoc: loc,
    dayOverrides: patchAll(trip.dayOverrides, (o) => ({ ...o, loc: undefined })),
  };
}

/**
 * Sets or clears fields of one day's override. A key set to undefined is removed, and an
 * override with nothing left in it is dropped.
 */
export function setDayOverride(trip: Trip, date: string, patch: DayOverride): Trip {
  const merged = clean({ ...trip.dayOverrides[date], ...patch });
  const dayOverrides = { ...trip.dayOverrides };
  if (merged) dayOverrides[date] = merged;
  else delete dayOverrides[date];
  return { ...trip, dayOverrides };
}

export type TripErrors = Partial<Record<'tripNumber' | 'tail' | 'dates', string>>;

export function validateTrip(trip: Trip): TripErrors {
  const errors: TripErrors = {};
  if (!trip.tripNumber.trim()) errors.tripNumber = 'Enter the trip number';
  if (!trip.tail.trim()) errors.tail = 'Enter the tail number';
  if (!isValidDate(trip.startDate) || !isValidDate(trip.endDate)) {
    errors.dates = 'Pick both dates';
  } else if (trip.endDate < trip.startDate) {
    errors.dates = 'Return date is before the start date';
  }
  return errors;
}

/** Tidies a trip before saving: trims text, uppercases ids, drops overrides outside the dates. */
export function prepareTripForSave(trip: Trip, now: number = Date.now()): Trip {
  const dayOverrides = Object.fromEntries(
    Object.entries(trip.dayOverrides).filter(
      ([date]) => date >= trip.startDate && date <= trip.endDate,
    ),
  );
  const customer = trip.customer?.trim();
  const notes = trip.notes?.trim();
  const saved: Trip = {
    ...trip,
    tripNumber: trip.tripNumber.trim().toUpperCase(),
    tail: trip.tail.trim().toUpperCase(),
    dayOverrides,
    updatedAt: now,
  };
  if (customer) saved.customer = customer;
  else delete saved.customer;
  if (notes) saved.notes = notes;
  else delete saved.notes;
  return saved;
}

/** randomUUID only exists on https/localhost; testing on a phone over plain http needs a fallback. */
function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function clean(o: DayOverride): DayOverride | null {
  const out: DayOverride = {};
  if (o.loc !== undefined) out.loc = o.loc;
  if (o.status !== undefined) out.status = o.status;
  if (o.amountCents !== undefined) out.amountCents = o.amountCents;
  return Object.keys(out).length > 0 ? out : null;
}

function patchAll(
  overrides: Record<string, DayOverride>,
  fn: (o: DayOverride) => DayOverride,
): Record<string, DayOverride> {
  const out: Record<string, DayOverride> = {};
  for (const [date, o] of Object.entries(overrides)) {
    const next = clean(fn(o));
    if (next) out[date] = next;
  }
  return out;
}
