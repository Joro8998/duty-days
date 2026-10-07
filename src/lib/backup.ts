// Backup file format: everything in the app as one JSON file. Pure — no database here.

import { daysBetween, isValidDate, longDate, monthOf, today } from './dates';
import type { DayOverride, MonthDaysOff, Settings, Trip } from './types';

export const BACKUP_VERSION = 1;
export const REMIND_AFTER_DAYS = 30;

export interface BackupData {
  settings: Settings;
  trips: Trip[];
  daysOff: MonthDaysOff[];
}

export interface BackupFile extends BackupData {
  app: 'duty-days';
  version: number;
  exportedAt: number;
}

export function serializeBackup(data: BackupData, now: number = Date.now()): string {
  const file: BackupFile = { app: 'duty-days', version: BACKUP_VERSION, exportedAt: now, ...data };
  return JSON.stringify(file, null, 2);
}

/** `duty-days-backup-2026-10-07.json` (this name is in .gitignore). */
export function backupFileName(now: number = Date.now()): string {
  return `duty-days-backup-${today(new Date(now))}.json`;
}

/** Remind when the last backup is 30+ days old, or when there is data that was never backed up. */
export function isBackupOverdue(
  lastBackupAt: number | null,
  hasData: boolean,
  now: number = Date.now(),
): boolean {
  if (lastBackupAt === null) return hasData;
  return daysBetween(today(new Date(lastBackupAt)), today(new Date(now))) >= REMIND_AFTER_DAYS;
}

/** 'today', 'yesterday', or '12 days ago' */
export function backupAgeLabel(lastBackupAt: number, now: number = Date.now()): string {
  const days = daysBetween(today(new Date(lastBackupAt)), today(new Date(now)));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** 'Backup from October 7, 2026: 12 trips, days off in 2 months.' */
export function backupSummary(file: BackupFile): string {
  const trips = file.trips.length;
  const months = file.daysOff.filter((m) => m.dates.length > 0).length;
  return (
    `Backup from ${longDate(today(new Date(file.exportedAt)))}: ` +
    `${trips} ${trips === 1 ? 'trip' : 'trips'}, ` +
    `days off in ${months} ${months === 1 ? 'month' : 'months'}.`
  );
}

/** Reads and checks a backup file. Throws an Error with a plain-language message if it's bad. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t a Duty Days backup.');
  }
  if (!isObject(raw) || raw.app !== 'duty-days') {
    throw new Error('This file isn’t a Duty Days backup.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app first.');
  }
  if (typeof raw.exportedAt !== 'number') damaged('missing backup date');
  if (!Array.isArray(raw.trips) || !Array.isArray(raw.daysOff)) damaged('missing trips');

  return {
    app: 'duty-days',
    version: raw.version,
    exportedAt: raw.exportedAt as number,
    settings: checkSettings(raw.settings),
    trips: (raw.trips as unknown[]).map(checkTrip),
    daysOff: (raw.daysOff as unknown[]).map(checkDaysOff),
  };
}

// ---------- validation ----------

function damaged(detail: string): never {
  throw new Error(`This backup looks damaged (${detail}).`);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const isCents = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
const isPositive = (v: unknown) => typeof v === 'number' && v > 0;
const isOptionalString = (v: unknown) => v === undefined || typeof v === 'string';

function checkSettings(v: unknown): Settings {
  if (!isObject(v)) damaged('missing settings');
  const ok =
    typeof v.pilotName === 'string' &&
    typeof v.base === 'string' &&
    typeof v.defaultTail === 'string' &&
    isCents(v.hourlyRateCents) &&
    isCents(v.domesticCents) &&
    isCents(v.internationalCents) &&
    isPositive(v.multiplier) &&
    isPositive(v.softDayHours) &&
    isOptionalString(v.accountingEmail);
  if (!ok) damaged('bad settings');
  return v as unknown as Settings;
}

function checkTrip(v: unknown, i: number): Trip {
  const where = `trip ${i + 1}`;
  if (!isObject(v)) damaged(where);
  const ok =
    typeof v.id === 'string' &&
    v.id !== '' &&
    typeof v.startDate === 'string' &&
    typeof v.endDate === 'string' &&
    isValidDate(v.startDate) &&
    isValidDate(v.endDate) &&
    v.endDate >= v.startDate &&
    typeof v.tripNumber === 'string' &&
    typeof v.tail === 'string' &&
    ['charter', 'training', 'positioning', 'pickup'].includes(v.kind as string) &&
    ['domestic', 'international'].includes(v.defaultLoc as string) &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    isOptionalString(v.customer) &&
    isOptionalString(v.notes) &&
    isObject(v.dayOverrides) &&
    Object.entries(v.dayOverrides).every(([date, o]) => isValidDate(date) && checkOverride(o));
  if (!ok) damaged(where);
  return v as unknown as Trip;
}

function checkOverride(o: unknown): o is DayOverride {
  return (
    isObject(o) &&
    (o.loc === undefined || o.loc === 'domestic' || o.loc === 'international') &&
    (o.status === undefined || o.status === 'flying' || o.status === 'layover') &&
    (o.amountCents === undefined || isCents(o.amountCents))
  );
}

function checkDaysOff(v: unknown): MonthDaysOff {
  const ok =
    isObject(v) &&
    typeof v.month === 'string' &&
    /^\d{4}-\d{2}$/.test(v.month) &&
    Array.isArray(v.dates) &&
    v.dates.every((d) => typeof d === 'string' && isValidDate(d) && monthOf(d) === v.month);
  if (!ok) damaged('days off');
  return v as unknown as MonthDaysOff;
}
