import { addMonths } from '../lib/dates';
import type { Trip } from '../lib/types';
import { db } from './db';

export async function getTrip(id: string): Promise<Trip | null> {
  return (await db.trips.get(id)) ?? null;
}

export async function saveTrip(trip: Trip): Promise<void> {
  await db.trips.put(trip);
}

export async function deleteTrip(id: string): Promise<void> {
  await db.trips.delete(id);
}

/** Other trips sharing at least one date with start–end. */
export async function overlappingTrips(
  startDate: string,
  endDate: string,
  excludeId: string,
): Promise<Trip[]> {
  const trips = await db.trips
    .where('startDate')
    .belowOrEqual(endDate)
    .filter((t) => t.endDate >= startDate && t.id !== excludeId)
    .toArray();
  return trips.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Trips with at least one day in the 'YYYY-MM' month, oldest first. */
export async function tripsForMonth(month: string): Promise<Trip[]> {
  return tripsForMonths(month, month);
}

/** Trips with at least one day in the 'YYYY' year, oldest first. */
export async function tripsForYear(year: string): Promise<Trip[]> {
  return tripsForMonths(`${year}-01`, `${year}-12`);
}

async function tripsForMonths(firstMonth: string, lastMonth: string): Promise<Trip[]> {
  const first = `${firstMonth}-01`;
  const afterLast = `${addMonths(lastMonth, 1)}-01`;
  const trips = await db.trips
    .where('startDate')
    .below(afterLast)
    .filter((t) => t.endDate >= first)
    .toArray();
  return trips.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt);
}
