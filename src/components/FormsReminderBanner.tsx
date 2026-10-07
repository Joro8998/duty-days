import { getSentMonths, markMonthSent } from '../db/forms';
import { useLiveQuery } from '../db/useLiveQuery';
import { today } from '../lib/dates';
import { formsReminder, formsReminderText } from '../lib/reminders';
import type { Settings } from '../lib/types';

interface Props {
  settings: Settings;
  onMakePdfs: (month: string) => void;
}

/** "October forms are due Sunday, Nov 1" — shown 5 days ahead until sent. */
export function FormsReminderBanner({ settings, onMakePdfs }: Props) {
  const sent = useLiveQuery(getSentMonths, []);
  if (!settings.paydayAnchor || sent.status !== 'ready') return null;

  const reminder = formsReminder(settings.paydayAnchor, today(), sent.value);
  if (!reminder) return null;

  return (
    <div className={`forms-reminder${reminder.daysLeft < 0 ? ' overdue' : ''}`} role="status">
      <span>{formsReminderText(reminder)}</span>
      <div className="forms-reminder-actions">
        <button
          type="button"
          className="button link"
          onClick={() => void markMonthSent(reminder.month)}
        >
          Sent
        </button>
        <button type="button" className="button small" onClick={() => onMakePdfs(reminder.month)}>
          Make PDFs
        </button>
      </div>
    </div>
  );
}
