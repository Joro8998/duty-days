import { describe, expect, it } from 'vitest';
import { calculateMonth } from './pay';
import { isPhoneOrTablet, monthEmail, outlookComposeUrl } from './email';
import type { Settings, Trip } from './types';

// Made-up values only.
const settings: Settings = {
  pilotName: 'Test Pilot',
  base: 'KAAA',
  hourlyRateCents: 5000,
  multiplier: 1.5,
  softDayHours: 8,
  domesticCents: 8000,
  internationalCents: 10000,
  defaultTail: 'N000TS',
  accountingEmail: 'accounting@example.com',
};

const trip: Trip = {
  id: '1',
  startDate: '2026-09-13',
  endDate: '2026-09-15',
  tripNumber: 'TEST01',
  tail: 'N000TS',
  kind: 'charter',
  defaultLoc: 'domestic',
  dayOverrides: {},
  createdAt: 0,
  updatedAt: 0,
};

describe('monthEmail', () => {
  it('fills recipient, subject, and totals', () => {
    const email = monthEmail(calculateMonth('2026-09', [trip], ['2026-09-14'], settings), settings);
    expect(email.to).toBe('accounting@example.com');
    expect(email.subject).toBe('Test Pilot - Per Diem & Soft Day - September 2026');
    expect(email.body).toContain('Per Diem: $240.00 (3 days)');
    expect(email.body).toContain('Soft Day: $600.00 (1 day)');
  });

  it('leaves the recipient blank when no accounting email is set', () => {
    const s = { ...settings, accountingEmail: undefined };
    expect(monthEmail(calculateMonth('2026-09', [], [], s), s).to).toBe('');
  });
});

describe('outlookComposeUrl', () => {
  it('builds a work Outlook compose link with encoded fields', () => {
    const url = outlookComposeUrl({
      to: 'a@example.com',
      subject: 'Per Diem & Soft Day',
      body: 'Hi,\nThanks',
    });
    expect(url).toBe(
      'https://outlook.office.com/mail/deeplink/compose?to=a%40example.com&subject=Per%20Diem%20%26%20Soft%20Day&body=Hi%2C%0AThanks',
    );
  });

  it('skips an empty recipient', () => {
    expect(outlookComposeUrl({ to: '', subject: 'S', body: 'B' })).toBe(
      'https://outlook.office.com/mail/deeplink/compose?subject=S&body=B',
    );
  });
});

describe('isPhoneOrTablet', () => {
  it('detects iPhone, iPad, and Android but not a laptop', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
    const windows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0';
    expect(isPhoneOrTablet(iphone, 5)).toBe(true);
    expect(isPhoneOrTablet(ipad, 5)).toBe(true);
    expect(isPhoneOrTablet(ipad, 0)).toBe(false); // a real Mac
    expect(isPhoneOrTablet('Mozilla/5.0 (Linux; Android 15)', 5)).toBe(true);
    expect(isPhoneOrTablet(windows, 10)).toBe(false); // touchscreen laptop
  });
});
