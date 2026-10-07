import { backupStatus } from '../db/backup';
import { useLiveQuery } from '../db/useLiveQuery';
import { backupAgeLabel, isBackupOverdue } from '../lib/backup';

/** Home-screen banner when the last backup is 30+ days old (or there's never been one). */
export function BackupReminder({ onBackUp }: { onBackUp: () => void }) {
  const status = useLiveQuery(backupStatus, []);
  if (status.status !== 'ready') return null;
  const { lastBackupAt, hasData } = status.value;
  if (!isBackupOverdue(lastBackupAt, hasData)) return null;

  return (
    <div className="backup-reminder" role="status">
      <span>
        {lastBackupAt === null
          ? 'Your trips aren’t backed up yet.'
          : `Last backup was ${backupAgeLabel(lastBackupAt)}.`}
      </span>
      <button type="button" className="button small" onClick={onBackUp}>
        Back up
      </button>
    </div>
  );
}
