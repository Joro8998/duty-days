// Email text and the Outlook-on-the-web compose link. Websites can't attach files to an email,
// so on a computer the PDFs are downloaded and dragged into the Outlook draft by hand.

import { monthLabel } from './dates';
import { formatCents } from './money';
import type { MonthResult, Settings } from './types';

/** Work / Microsoft 365 Outlook. */
const OUTLOOK_COMPOSE = 'https://outlook.office.com/mail/deeplink/compose';

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export function monthEmail(result: MonthResult, settings: Settings): EmailDraft {
  const month = monthLabel(result.month);
  return {
    to: settings.accountingEmail ?? '',
    subject: `${settings.pilotName} - Per Diem & Soft Day - ${month}`,
    body: [
      'Hi,',
      '',
      `Attached are my Per Diem and Soft Day forms for ${month}.`,
      '',
      `Per Diem: ${formatCents(result.perDiemTotalCents)} (${days(result.days.length)})`,
      `Soft Day: ${formatCents(result.softDayTotalCents)} (${days(result.softDayCount)})`,
      '',
      'Thanks,',
      settings.pilotName,
    ].join('\n'),
  };
}

export function outlookComposeUrl(draft: EmailDraft): string {
  // encodeURIComponent (not URLSearchParams) so spaces become %20 rather than '+'.
  const params = Object.entries(draft)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return `${OUTLOOK_COMPOSE}?${params.join('&')}`;
}

/** iPhone, iPad (which reports itself as a Mac), or Android. */
export function isPhoneOrTablet(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
