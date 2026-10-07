import { describe, expect, it } from 'vitest';
import { eachDate } from './dates';
import {
  calculateMonth,
  perDiemBreakdown,
  perDiemByTrip,
  softDayBreakdown,
  softDayRateCents,
  tripDays,
  tripMonths,
} from './pay';
import type { DayOverride, LocType, Settings, Trip, TripKind } from './types';

// Made-up test values only (SPEC.md section 9). No real names, rates, or trip numbers.
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

let nextId = 1;
function trip(
  tripNumber: string,
  startDate: string,
  endDate: string,
  defaultLoc: LocType,
  extra: { kind?: TripKind; dayOverrides?: Record<string, DayOverride> } = {},
): Trip {
  const id = String(nextId++);
  return {
    id,
    startDate,
    endDate,
    tripNumber,
    tail: 'N000TS',
    kind: extra.kind ?? 'charter',
    defaultLoc,
    dayOverrides: extra.dayOverrides ?? {},
    createdAt: Number(id),
    updatedAt: Number(id),
  };
}

const amounts = (t: Trip) => tripDays(t, settings).map((d) => d.perDiemCents);

describe('soft day rate', () => {
  it('$50.00 × 1.5 × 8 = $600.00', () => {
    expect(softDayRateCents(settings)).toBe(60000);
  });

  // Made-up rate (the real one stays on the phone): $68.27 × 1.5 = $102.405.
  it('rounds the hourly × 1.5 to the cent first: $68.27 → $102.41 × 8 = $819.28', () => {
    const s = { ...settings, hourlyRateCents: 6827 };
    expect(softDayRateCents(s)).toBe(81928);
    expect(softDayRateCents(s) * 5).toBe(409640);
    // Multiplying first and rounding last would give $819.24 — the wrong answer.
    expect(Math.round(6827 * 1.5 * 8)).toBe(81924);
  });

  it('breaks the rate into printable steps', () => {
    expect(softDayBreakdown({ ...settings, hourlyRateCents: 6827 })).toEqual({
      hourlyRateCents: 6827,
      multiplier: 1.5,
      perHourCents: 10241,
      hours: 8,
      perDayCents: 81928,
    });
  });

  it('rounds half a cent up', () => {
    // $64.31 × 1.5 = $96.465 → $96.47
    expect(softDayRateCents({ ...settings, hourlyRateCents: 6431 })).toBe(9647 * 8);
  });
});

describe('September 2026 (spec 9.1)', () => {
  const trips = [
    trip('TRIP-A', '2026-09-04', '2026-09-07', 'international'),
    trip('TRIP-B', '2026-09-13', '2026-09-17', 'domestic'),
    trip('TRIP-C', '2026-09-27', '2026-09-27', 'domestic'),
    trip('TRIP-D', '2026-09-28', '2026-10-02', 'domestic'),
  ];
  const daysOff = [
    ...eachDate('2026-09-08', '2026-09-12'),
    ...eachDate('2026-09-20', '2026-09-26'),
  ];

  it('September totals', () => {
    const r = calculateMonth('2026-09', trips, daysOff, settings);
    expect(r.days).toHaveLength(13);
    expect(r.domesticDays).toBe(9);
    expect(r.internationalDays).toBe(4);
    expect(r.perDiemTotalCents).toBe(112000);
    expect(r.softDayCount).toBe(0);
    expect(r.softDayTotalCents).toBe(0);
    expect(r.daysOff).toHaveLength(12);
    expect(r.carryNotes).toEqual(['Trip TRIP-D (Sep 28 – Oct 2): Oct 1–2 on October form']);
  });

  it('October gets only the tail of trip D', () => {
    const r = calculateMonth('2026-10', trips, daysOff, settings);
    expect(r.days.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(r.perDiemTotalCents).toBe(16000);
    expect(r.carryNotes).toEqual(['Trip TRIP-D (Sep 28 – Oct 2): Sep 28–30 on September form']);
  });
});

describe('February 2026 (spec 9.2)', () => {
  const trips = [
    trip('TRIP-A', '2026-02-01', '2026-02-01', 'domestic'),
    trip('TRIP-B', '2026-02-07', '2026-02-08', 'domestic'),
    trip('TRIP-C', '2026-02-12', '2026-02-16', 'international'),
    trip('TRIP-D', '2026-02-18', '2026-02-19', 'domestic'),
    trip('TRIP-E', '2026-02-24', '2026-02-26', 'domestic'),
  ];
  // Includes two days off that were not worked; they must not count.
  const daysOff = [
    '2026-02-07',
    '2026-02-08',
    '2026-02-24',
    '2026-02-25',
    '2026-02-26',
    '2026-02-27',
    '2026-02-28',
  ];
  const r = calculateMonth('2026-02', trips, daysOff, settings);

  it('per diem', () => {
    expect(r.days).toHaveLength(13);
    expect(r.domesticDays).toBe(8);
    expect(r.internationalDays).toBe(5);
    expect(r.perDiemTotalCents).toBe(114000);
  });

  it('soft days', () => {
    expect(r.days.filter((d) => d.isDayOff).map((d) => d.date)).toEqual([
      '2026-02-07',
      '2026-02-08',
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
    ]);
    expect(r.softDayCount).toBe(5);
    expect(r.softDayTotalCents).toBe(300000);
  });

  it('per diem breakdown lines: 8 × $80 + 5 × $100', () => {
    expect(perDiemBreakdown(r, settings)).toEqual({
      domestic: { days: 8, rateCents: 8000, subtotalCents: 64000 },
      international: { days: 5, rateCents: 10000, subtotalCents: 50000 },
      adjustmentCents: 0,
      totalCents: 114000,
    });
  });

  it('day status defaults: first/last Flying, middle Layover', () => {
    const e = r.days.filter((d) => d.tripNumber === 'TRIP-E').map((d) => d.status);
    expect(e).toEqual(['flying', 'layover', 'flying']);
  });

  it('no carry notes when nothing crosses a month', () => {
    expect(r.carryNotes).toEqual([]);
  });
});

describe('rule edge cases (spec 9.3)', () => {
  it('same-day trip to an international airport pays Domestic', () => {
    const t = trip('X', '2026-03-01', '2026-03-01', 'international');
    expect(amounts(t)).toEqual([8000]);
    expect(tripDays(t, settings)[0]!.status).toBe('flying');
  });

  it('international trip: return day takes the previous night (International)', () => {
    expect(amounts(trip('X', '2026-03-01', '2026-03-03', 'international'))).toEqual([
      10000, 10000, 10000,
    ]);
  });

  it('mixed trip: each day follows its own night', () => {
    const t = trip('X', '2026-03-01', '2026-03-04', 'domestic', {
      dayOverrides: {
        '2026-03-02': { loc: 'international' },
        '2026-03-03': { loc: 'international' },
      },
    });
    expect(amounts(t)).toEqual([8000, 10000, 10000, 10000]);
  });

  it('a Dom/Intl flip on the return day is ignored', () => {
    const t = trip('X', '2026-03-01', '2026-03-02', 'domestic', {
      dayOverrides: { '2026-03-02': { loc: 'international' } },
    });
    expect(amounts(t)).toEqual([8000, 8000]);
    expect(tripDays(t, settings).map((d) => d.locEditable)).toEqual([true, false]);
  });

  it('back-to-back trips: the shared date is paid once, at the higher rate', () => {
    const x = trip('X', '2026-03-01', '2026-03-03', 'international');
    const y = trip('Y', '2026-03-03', '2026-03-05', 'domestic');
    const r = calculateMonth('2026-03', [x, y], [], settings);
    const mar3 = r.days.find((d) => d.date === '2026-03-03')!;
    expect(r.days).toHaveLength(5);
    expect(mar3.perDiemCents).toBe(10000);
    expect(mar3.loc).toBe('international');
    expect(mar3.tripNumber).toBe('X / Y');
    expect(mar3.tripIds).toEqual([x.id, y.id]);
    expect(r.perDiemTotalCents).toBe(10000 * 3 + 8000 * 2);
    expect(mar3.paidTripId).toBe(x.id);
  });

  it('per-trip amounts add up to the month total, shared dates counted once', () => {
    const x = trip('X', '2026-03-01', '2026-03-03', 'international');
    const y = trip('Y', '2026-03-03', '2026-03-05', 'domestic');
    const byTrip = perDiemByTrip(calculateMonth('2026-03', [x, y], [], settings));
    expect(byTrip.get(x.id)).toBe(30000);
    expect(byTrip.get(y.id)).toBe(16000);
  });

  it('a manual amount wins over the rule', () => {
    const t = trip('X', '2026-03-01', '2026-03-03', 'domestic', {
      dayOverrides: { '2026-03-02': { amountCents: 4500 } },
    });
    expect(amounts(t)).toEqual([8000, 4500, 8000]);
  });

  it('manual amounts show up as an adjustment so the breakdown adds up', () => {
    const t = trip('X', '2026-03-01', '2026-03-03', 'domestic', {
      dayOverrides: { '2026-03-02': { amountCents: 4500 } },
    });
    const b = perDiemBreakdown(calculateMonth('2026-03', [t], [], settings), settings);
    expect(b.domestic.subtotalCents).toBe(24000);
    expect(b.adjustmentCents).toBe(-3500);
    expect(b.totalCents).toBe(20500);
  });

  it('a manual amount wins over a higher rate from another trip on the same date', () => {
    const x = trip('X', '2026-03-01', '2026-03-03', 'international', {
      dayOverrides: { '2026-03-03': { amountCents: 5000 } },
    });
    const y = trip('Y', '2026-03-03', '2026-03-04', 'domestic');
    const r = calculateMonth('2026-03', [x, y], [], settings);
    expect(r.days.find((d) => d.date === '2026-03-03')!.perDiemCents).toBe(5000);
  });

  it('a trip day on a day off earns both per diem and soft day pay', () => {
    const t = trip('X', '2026-03-10', '2026-03-10', 'domestic');
    const r = calculateMonth('2026-03', [t], ['2026-03-10'], settings);
    expect(r.days[0]).toMatchObject({ perDiemCents: 8000, isDayOff: true, softDayCents: 60000 });
    expect(r.perDiemTotalCents).toBe(8000);
    expect(r.softDayTotalCents).toBe(60000);
  });

  it('two trips on the same day off: soft day paid once', () => {
    const x = trip('X', '2026-03-08', '2026-03-10', 'domestic');
    const y = trip('Y', '2026-03-10', '2026-03-12', 'domestic');
    const r = calculateMonth('2026-03', [x, y], ['2026-03-10'], settings);
    expect(r.softDayCount).toBe(1);
    expect(r.softDayTotalCents).toBe(60000);
  });

  it('training, positioning, and pickup earn per diem like charter', () => {
    for (const kind of ['charter', 'training', 'positioning', 'pickup'] as const) {
      expect(amounts(trip('X', '2026-03-01', '2026-03-03', 'domestic', { kind }))).toEqual([
        8000, 8000, 8000,
      ]);
    }
  });

  it('a manual status wins over the default', () => {
    const t = trip('X', '2026-03-01', '2026-03-03', 'domestic', {
      dayOverrides: { '2026-03-02': { status: 'flying' } },
    });
    expect(tripDays(t, settings).map((d) => d.status)).toEqual(['flying', 'flying', 'flying']);
  });

  it('days off from other months are ignored', () => {
    const t = trip('X', '2026-03-31', '2026-04-01', 'domestic');
    const r = calculateMonth('2026-03', [t], ['2026-04-01'], settings);
    expect(r.softDayCount).toBe(0);
    expect(r.daysOff).toEqual([]);
  });

  it('rejects a trip that returns before it starts', () => {
    expect(() => tripDays(trip('X', '2026-03-05', '2026-03-04', 'domestic'), settings)).toThrow();
  });

  it('tripMonths lists every month a trip touches', () => {
    expect(tripMonths(trip('X', '2026-12-30', '2027-01-02', 'domestic'))).toEqual([
      '2026-12',
      '2027-01',
    ]);
  });
});
