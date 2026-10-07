// IndexedDB schema (Dexie). Everything stays on the phone.

import Dexie, { type EntityTable } from 'dexie';
import type { MonthDaysOff, Settings, Trip } from '../lib/types';

/** Settings are a single row with a fixed key. */
export interface SettingsRow extends Settings {
  id: 'main';
}

export const db = new Dexie('duty-days') as Dexie & {
  settings: EntityTable<SettingsRow, 'id'>;
  trips: EntityTable<Trip, 'id'>;
  daysOff: EntityTable<MonthDaysOff, 'month'>;
};

db.version(1).stores({
  settings: 'id',
  trips: 'id, startDate, endDate',
  daysOff: 'month',
});
