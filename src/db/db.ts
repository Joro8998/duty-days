// IndexedDB schema (Dexie). Everything stays on the phone.

import Dexie, { type EntityTable } from 'dexie';
import type { MonthDaysOff, Settings, Trip } from '../lib/types';

/** Settings are a single row with a fixed key. */
export interface SettingsRow extends Settings {
  id: 'main';
}

/** Small app bookkeeping values, e.g. when the last backup was made. */
export interface MetaRow {
  key: string;
  value: unknown;
}

export const db = new Dexie('duty-days') as Dexie & {
  settings: EntityTable<SettingsRow, 'id'>;
  trips: EntityTable<Trip, 'id'>;
  daysOff: EntityTable<MonthDaysOff, 'month'>;
  meta: EntityTable<MetaRow, 'key'>;
};

// Never edit a released version. Add a new one; Dexie upgrades existing phones in place.
db.version(1).stores({
  settings: 'id',
  trips: 'id, startDate, endDate',
  daysOff: 'month',
});

// v2 (app 0.2.0): adds `meta`. Existing tables are untouched.
db.version(2).stores({
  meta: 'key',
});
