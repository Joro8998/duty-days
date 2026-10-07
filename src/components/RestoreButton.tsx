import { useRef, useState, type ChangeEvent } from 'react';
import { restoreBackup } from '../db/backup';
import { backupSummary, parseBackup, type BackupFile } from '../lib/backup';

interface Props {
  label?: string;
  /** Extra warning shown before replacing (not needed on a fresh install). */
  replacesData?: boolean;
  onRestored?: () => void | Promise<void>;
}

/** Pick a backup file, confirm, and replace everything in the app with it. */
export function RestoreButton({
  label = 'Restore from backup',
  replacesData = true,
  onRestored,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setMessage(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setPending(null);
      setMessage({
        text: err instanceof Error ? err.message : 'Could not read that file.',
        error: true,
      });
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending);
      setPending(null);
      setMessage({ text: 'Restored. Everything is back.' });
      await onRestored?.();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Restore failed. Nothing was changed.', error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="restore">
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={handleFile} />
      {!pending && (
        <button
          type="button"
          className="button secondary wide"
          onClick={() => input.current?.click()}
        >
          {label}
        </button>
      )}

      {pending && (
        <div className="confirm-box" role="alertdialog" aria-label="Confirm restore">
          <p>{backupSummary(pending)}</p>
          {replacesData && (
            <p className="confirm-warning">
              This replaces everything in the app right now with what’s in the backup.
            </p>
          )}
          <div className="confirm-actions">
            <button type="button" className="button secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="button" className="button small" disabled={busy} onClick={confirm}>
              {busy ? 'Restoring…' : replacesData ? 'Replace everything' : 'Restore'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.error ? 'field-error' : 'form-status'} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
