import type { BackupData, BackupFile } from '../lib/backup';
import { db } from './db';
import { getSettings } from './settings';

const LAST_BACKUP_KEY = 'lastBackupAt';

/** Everything in the app, ready to serialize. Null before first-run setup. */
export async function readAllData(): Promise<BackupData | null> {
  const [settings, trips, daysOff] = await Promise.all([
    getSettings(),
    db.trips.toArray(),
    db.daysOff.toArray(),
  ]);
  if (!settings) return null;
  return { settings, trips, daysOff };
}

/** Replaces everything in the app with the backup's contents. All or nothing. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', [db.settings, db.trips, db.daysOff, db.meta], async () => {
    await Promise.all([db.trips.clear(), db.daysOff.clear()]);
    await db.settings.put({ ...file.settings, id: 'main' });
    await db.trips.bulkPut(file.trips);
    await db.daysOff.bulkPut(file.daysOff);
    // The app now holds exactly what that backup holds, so it's as fresh as the backup.
    await db.meta.put({ key: LAST_BACKUP_KEY, value: file.exportedAt });
  });
}

export async function getLastBackupAt(): Promise<number | null> {
  const row = await db.meta.get(LAST_BACKUP_KEY);
  return typeof row?.value === 'number' ? row.value : null;
}

export async function setLastBackupAt(when: number): Promise<void> {
  await db.meta.put({ key: LAST_BACKUP_KEY, value: when });
}

/** For the reminder: when the last backup was, and whether there's anything worth backing up. */
export async function backupStatus(): Promise<{ lastBackupAt: number | null; hasData: boolean }> {
  const [lastBackupAt, tripCount] = await Promise.all([getLastBackupAt(), db.trips.count()]);
  return { lastBackupAt, hasData: tripCount > 0 };
}
