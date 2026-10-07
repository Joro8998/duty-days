import { useState } from 'react';
import { useMonthData } from '../db/useMonthData';
import { monthLabel, today } from '../lib/dates';
import { formatCents } from '../lib/money';
import { softDayRateCents } from '../lib/pay';
import { pdfFileName, perDiemPdf, softDayPdf, type PdfKind } from '../lib/pdf';
import { isPhoneOrTablet, monthEmail, outlookComposeUrl } from '../lib/email';
import { downloadFiles, shareFiles } from '../lib/share';
import type { MonthResult, Settings } from '../lib/types';

interface Props {
  month: string;
  settings: Settings;
  onBack: () => void;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

function buildFile(kind: PdfKind, result: MonthResult, settings: Settings): File {
  const generatedOn = today();
  const doc =
    kind === 'perDiem'
      ? perDiemPdf(result, settings, generatedOn)
      : softDayPdf(result, settings, generatedOn);
  return new File([doc.output('blob')], pdfFileName(settings.pilotName, kind, result.month), {
    type: 'application/pdf',
  });
}

const BOTH: PdfKind[] = ['perDiem', 'softDay'];

export function Export({ month, settings, onBack }: Props) {
  const data = useMonthData(month, settings);
  const [status, setStatus] = useState<string | null>(null);
  const [onPhone] = useState(() => isPhoneOrTablet(navigator.userAgent, navigator.maxTouchPoints));

  // Everything up to share()/window.open runs synchronously inside the tap, so the browser
  // still treats it as user-initiated (iOS share sheet, popup blocker).
  async function run(action: () => Promise<string | null> | string | null) {
    setStatus(null);
    try {
      setStatus(await action());
    } catch (err) {
      console.error(err);
      setStatus('Something went wrong making the PDF. Please try again.');
    }
  }

  const files = (kinds: PdfKind[]) => kinds.map((kind) => buildFile(kind, data!.result, settings));
  const downloadedMessage = (n: number) =>
    n === 1 ? 'Saved to your Downloads folder.' : 'Both PDFs saved to your Downloads folder.';

  function handleEmail() {
    if (!data) return;
    const draft = monthEmail(data.result, settings);
    if (onPhone) {
      void run(async () => {
        const outcome = await shareFiles(files(BOTH), { title: draft.subject, text: draft.body });
        return outcome === 'downloaded' ? downloadedMessage(2) : null;
      });
      return;
    }
    void run(() => {
      downloadFiles(files(BOTH));
      window.open(outlookComposeUrl(draft), '_blank', 'noopener');
      return 'Both PDFs are in your Downloads folder. Drag them into the Outlook email.';
    });
  }

  function handleDownload(kinds: PdfKind[]) {
    if (!data) return;
    if (onPhone) {
      // iPhone saves files through the share sheet ("Save to Files").
      void run(async () => {
        const outcome = await shareFiles(files(kinds), { title: `${monthLabel(month)} forms` });
        return outcome === 'downloaded' ? downloadedMessage(kinds.length) : null;
      });
      return;
    }
    void run(() => {
      downloadFiles(files(kinds));
      return downloadedMessage(kinds.length);
    });
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="button link back" onClick={onBack}>
          ‹ Back
        </button>
        <h1 className="screen-title">{monthLabel(month)}</h1>
        <span className="header-spacer" />
      </header>

      {data && (
        <>
          <section className="summary-card">
            <h2>Per Diem</h2>
            <p className="summary-amount">{formatCents(data.result.perDiemTotalCents)}</p>
            <p className="summary-detail">
              {days(data.result.days.length)} · {data.result.domesticDays} domestic ·{' '}
              {data.result.internationalDays} international
            </p>
          </section>

          <section className={`summary-card${data.result.softDayCount > 0 ? ' has-soft' : ''}`}>
            <h2>Soft Day</h2>
            <p className="summary-amount">{formatCents(data.result.softDayTotalCents)}</p>
            <p className="summary-detail">
              {data.result.softDayCount === 0
                ? 'No soft days this month'
                : `${days(data.result.softDayCount)} × ${formatCents(softDayRateCents(settings))}`}
            </p>
          </section>

          {data.result.carryNotes.length > 0 && (
            <ul className="carry-notes">
              {data.result.carryNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}

          <div className="share-buttons">
            <button type="button" className="button primary" onClick={handleEmail}>
              Email PDFs
            </button>
            <p className="field-hint share-hint">
              {onPhone
                ? 'Opens the share sheet. Tap Mail and both PDFs are attached.'
                : 'Saves both PDFs and opens Outlook with the email filled in. Drag the two files from Downloads into the email.'}
              {!settings.accountingEmail &&
                ' Add the accounting email in Settings to fill in the To line.'}
            </p>

            <button type="button" className="button secondary" onClick={() => handleDownload(BOTH)}>
              Download both PDFs
            </button>
            <div className="download-pair">
              <button
                type="button"
                className="button secondary"
                onClick={() => handleDownload(['perDiem'])}
              >
                Per Diem only
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => handleDownload(['softDay'])}
              >
                Soft Day only
              </button>
            </div>
          </div>

          {status && (
            <p className="form-status" role="status">
              {status}
            </p>
          )}
        </>
      )}
    </main>
  );
}
