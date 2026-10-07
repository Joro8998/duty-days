import { describe, expect, it } from 'vitest';
import {
  backupAgeLabel,
  backupFileName,
  backupSummary,
  isBackupOverdue,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup';

// Made-up values only.
const data: BackupData = {
  settings: {
    pilotName: 'Test Pilot',
    base: 'KAAA',
    hourlyRateCents: 5000,
    multiplier: 1.5,
    softDayHours: 8,
    domesticCents: 8000,
    internationalCents: 10000,
    defaultTail: 'N000TS',
  },
  trips: [
    {
      id: 'a1',
      startDate: '2026-10-01',
      endDate: '2026-10-03',
      tripNumber: 'TEST01',
      tail: 'N000TS',
      kind: 'charter',
      defaultLoc: 'international',
      dayOverrides: { '2026-10-02': { status: 'flying', amountCents: 4500 } },
      createdAt: 1,
      updatedAt: 2,
    },
  ],
  daysOff: [{ month: '2026-10', dates: ['2026-10-02', '2026-10-20'] }],
};

// Local-time timestamps so the expected dates don't depend on UTC.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('backup round trip', () => {
  it('restores exactly what was saved', () => {
    const file = parseBackup(serializeBackup(data, 123));
    expect(file).toEqual({ app: 'duty-days', version: 1, exportedAt: 123, ...data });
  });

  it('names the file by local date', () => {
    expect(backupFileName(at(2026, 10, 7, 23))).toBe('duty-days-backup-2026-10-07.json');
  });
});

describe('parseBackup rejects bad files with a plain message', () => {
  const withTrip = (patch: object) =>
    JSON.stringify({
      ...JSON.parse(serializeBackup(data)),
      trips: [{ ...data.trips[0], ...patch }],
    });

  it('not JSON, or not ours', () => {
    expect(() => parseBackup('hello')).toThrow('isn’t a Duty Days backup');
    expect(() => parseBackup('{"app":"other"}')).toThrow('isn’t a Duty Days backup');
  });

  it('from a newer app version', () => {
    const newer = JSON.stringify({ ...JSON.parse(serializeBackup(data)), version: 99 });
    expect(() => parseBackup(newer)).toThrow('newer version');
  });

  it('damaged trips', () => {
    expect(() => parseBackup(withTrip({ endDate: '2026-09-30' }))).toThrow('trip 1');
    expect(() => parseBackup(withTrip({ startDate: '2026-02-30' }))).toThrow('trip 1');
    expect(() => parseBackup(withTrip({ kind: 'party' }))).toThrow('trip 1');
    expect(() => parseBackup(withTrip({ dayOverrides: { x: {} } }))).toThrow('trip 1');
  });

  it('damaged days off or settings', () => {
    const base = JSON.parse(serializeBackup(data));
    const badOff = { ...base, daysOff: [{ month: '2026-10', dates: ['2026-11-01'] }] };
    expect(() => parseBackup(JSON.stringify(badOff))).toThrow('days off');
    const badSettings = { ...base, settings: { ...base.settings, hourlyRateCents: 'lots' } };
    expect(() => parseBackup(JSON.stringify(badSettings))).toThrow('settings');
  });
});

describe('labels', () => {
  it('backupAgeLabel', () => {
    const now = at(2026, 10, 7, 9);
    expect(backupAgeLabel(at(2026, 10, 7, 1), now)).toBe('today');
    expect(backupAgeLabel(at(2026, 10, 6, 23), now)).toBe('yesterday');
    expect(backupAgeLabel(at(2026, 9, 25), now)).toBe('12 days ago');
  });

  it('backupSummary', () => {
    const file = parseBackup(serializeBackup(data, at(2026, 10, 7)));
    expect(backupSummary(file)).toBe('Backup from October 7, 2026: 1 trip, days off in 1 month.');
  });
});

describe('isBackupOverdue', () => {
  const now = at(2026, 10, 31);

  it('reminds after 30 days', () => {
    expect(isBackupOverdue(at(2026, 10, 2), true, now)).toBe(false); // 29 days
    expect(isBackupOverdue(at(2026, 10, 1), true, now)).toBe(true); // 30 days
  });

  it('reminds if there is data that was never backed up', () => {
    expect(isBackupOverdue(null, true, now)).toBe(true);
    expect(isBackupOverdue(null, false, now)).toBe(false);
  });
});
