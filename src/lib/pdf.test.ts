import { describe, expect, it } from 'vitest';
import { eachDate } from './dates';
import { calculateMonth } from './pay';
import { pdfFileName, perDiemPdf, softDayPdf } from './pdf';
import type { LocType, Settings, Trip } from './types';

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
};

function trip(tripNumber: string, startDate: string, endDate: string, defaultLoc: LocType): Trip {
  return {
    id: tripNumber,
    startDate,
    endDate,
    tripNumber,
    tail: 'N000TS',
    kind: 'charter',
    defaultLoc,
    dayOverrides: {},
    createdAt: 0,
    updatedAt: 0,
  };
}

const trips = [
  trip('TRIP-A', '2026-09-04', '2026-09-07', 'international'),
  trip('TRIP-B', '2026-09-13', '2026-09-17', 'domestic'),
  trip('TRIP-C', '2026-09-27', '2026-09-27', 'domestic'),
  trip('TRIP-D', '2026-09-28', '2026-10-02', 'domestic'),
  trip('TRIP-E', '2026-10-30', '2026-11-03', 'international'),
];
const daysOff = [
  ...eachDate('2026-09-08', '2026-09-12'),
  ...eachDate('2026-09-20', '2026-09-26'),
  '2026-10-01',
];

/** jsPDF writes text uncompressed by default, so it can be searched in the raw output. */
const raw = (doc: { output: () => string }) => doc.output();

describe('file names', () => {
  it('follows First_Last_Per_Diem_September_2026.pdf', () => {
    expect(pdfFileName('Test Pilot', 'perDiem', '2026-09')).toBe(
      'Test_Pilot_Per_Diem_September_2026.pdf',
    );
    expect(pdfFileName('  Test   Pilot ', 'softDay', '2026-09')).toBe(
      'Test_Pilot_Soft_Day_September_2026.pdf',
    );
    expect(pdfFileName('', 'perDiem', '2026-09')).toBe('Duty_Days_Per_Diem_September_2026.pdf');
  });
});

describe('Per Diem PDF', () => {
  const result = calculateMonth('2026-09', trips, daysOff, settings);
  const out = raw(perDiemPdf(result, settings, '2026-10-06'));

  it('prints title, rates, breakdown, total, carry note, and footer', () => {
    expect(out).toContain('(Test Pilot Per Diem)');
    expect(out).toContain('(September 2026)');
    expect(out).toContain('(Base: KAAA)');
    expect(out).toContain('Domestic: 9 days');
    expect(out).toContain('International: 4 days');
    expect(out).toContain('(Total Per Diem: $1,120.00)');
    expect(out).toContain('Oct 1-2 on October form');
    expect(out).toContain('(Total days: 13)');
    expect(out).toContain('(Generated October 6, 2026)');
  });

  it('a 31-day month with two carry notes fits on one page', () => {
    const oct = calculateMonth('2026-10', trips, daysOff, settings);
    expect(oct.carryNotes).toHaveLength(2);
    expect(perDiemPdf(oct, settings, '2026-10-06').getNumberOfPages()).toBe(1);
    expect(softDayPdf(oct, settings, '2026-10-06').getNumberOfPages()).toBe(1);
  });
});

describe('Soft Day PDF', () => {
  it('prints the rate math and total', () => {
    const oct = calculateMonth('2026-10', trips, daysOff, settings);
    const out = raw(softDayPdf(oct, settings, '2026-10-06'));
    expect(out).toContain('(Test Pilot Soft Day)');
    expect(out).toContain('Hourly rate $50.00');
    expect(out).toContain('$600.00 per day');
    expect(out).toContain('1 day = $600.00');
    expect(out).toContain('(Soft days: 1)');
  });

  it('still generates with no soft days', () => {
    const sep = calculateMonth('2026-09', trips, daysOff, settings);
    const out = raw(softDayPdf(sep, settings, '2026-10-06'));
    expect(out).toContain('days = $0.00');
    expect(out).toContain('(No soft days this month.)');
  });
});
