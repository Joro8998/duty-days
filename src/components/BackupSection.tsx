import { useState } from 'react';
import { backupStatus, readAllData, setLastBackupAt } from '../db/backup';
import { useLiveQuery } from '../db/useLiveQuery';
import { backupAgeLabel, backupFileName, isBackupOverdue, serializeBackup } from '../lib/backup';
import { longDate, today } from '../lib/dates';
import { isPhoneOrTablet } from '../lib/email';
import { downloadFiles, shareFiles } from '../lib/share';
import { RestoreButton } from './RestoreButton';

export function BackupSection() {
  // Loaded ahead of time so the tap can open the share sheet immediately (iOS requires it).
  const data = useLiveQuery(readAllData, []);
  const status = useLiveQuery(backupStatus, []);
  const [message, setMessage] = useState<string | null>(null);
  const [onPhone] = useState(() => isPhoneOrTablet(navigator.userAgent, navigator.maxTouchPoints));

  async function handleBackup() {
    if (data.status !== 'ready' || !data.value) return;
    setMessage(null);
    const now = Date.now();
    const file = new File([serializeBackup(data.value, now)], backupFileName(now), {
      type: 'application/json',
    });
    try {
      if (onPhone) {
        const outcome = await shareFiles([file], { title: 'Duty Days backup' });
        if (outcome === 'cancelled') return;
      } else {
        downloadFiles([file]);
      }
      await setLastBackupAt(now);
      setMessage(
        onPhone
          ? 'Backup made. Keep the file somewhere safe, like iCloud Drive.'
          : 'Backup saved to your Downloads folder.',
      );
    } catch (err) {
      console.error(err);
      setMessage('Backup failed. Please try again.');
    }
  }

  const last = status.status === 'ready' ? status.value.lastBackupAt : null;
  const overdue = status.status === 'ready' && isBackupOverdue(last, status.value.hasData);

  return (
    <section className="form backup-section">
      <fieldset>
        <legend>Backup</legend>
        <p className={`backup-last${overdue ? ' overdue' : ''}`}>
          Last backup:{' '}
          {last === null ? (
            <strong>never</strong>
          ) : (
            <>
              <strong>{longDate(today(new Date(last)))}</strong> ({backupAgeLabel(last)})
            </>
          )}
        </p>
        <p className="field-hint">
          Your trips live only on this device. A backup file lets you get them back after
          reinstalling, or move them to another phone or computer.
          {onPhone &&
            ' In the share sheet, pick Save to Files (iCloud Drive) or Mail it to yourself.'}
        </p>
        <button type="button" className="button primary" onClick={handleBackup}>
          Back up now
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
        <RestoreButton />
      </fieldset>
    </section>
  );
}
