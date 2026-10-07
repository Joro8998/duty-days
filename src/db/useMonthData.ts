import { useMemo } from 'react';
import { calculateMonth } from '../lib/pay';
import type { MonthResult, Settings, Trip } from '../lib/types';
import { daysOffForMonth } from './daysOff';
import { tripsForMonth } from './trips';
import { useLiveQuery } from './useLiveQuery';

export interface MonthData {
  trips: Trip[];
  daysOff: string[];
  result: MonthResult;
}

/** A month's trips and days off, plus the calculated pay. Null while loading. */
export function useMonthData(month: string, settings: Settings): MonthData | null {
  const data = useLiveQuery(async () => {
    const [trips, daysOff] = await Promise.all([tripsForMonth(month), daysOffForMonth(month)]);
    return { trips, daysOff };
  }, [month]);

  return useMemo(() => {
    if (data.status !== 'ready') return null;
    const { trips, daysOff } = data.value;
    return { trips, daysOff, result: calculateMonth(month, trips, daysOff, settings) };
  }, [data, month, settings]);
}
