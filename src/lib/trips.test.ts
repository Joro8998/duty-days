import { describe, expect, it } from 'vitest';
import { tripTotals } from './pay';
import {
  newTripDraft,
  prepareTripForSave,
  setDayOverride,
  setTripDates,
  setTripLoc,
  validateTrip,
} from './trips';
import type { Settings } from './types';

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

const draft = () => newTripDraft('2026-03-01', settings, 1000);

describe('newTripDraft', () => {
  it('starts as a same-day domestic charter on the default tail', () => {
    const t = draft();
    expect(t).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-01',
      tail: 'N000TS',
      kind: 'charter',
      defaultLoc: 'domestic',
      dayOverrides: {},
      createdAt: 1000,
    });
    expect(t.id).toBeTruthy();
    expect(draft().id).not.toBe(t.id);
  });
});

describe('setTripDates', () => {
  it('keeps return on or after start', () => {
    const t = setTripDates(draft(), '2026-03-05', '2026-03-02');
    expect([t.startDate, t.endDate]).toEqual(['2026-03-05', '2026-03-05']);
  });

  it('ignores a cleared date input', () => {
    const t = draft();
    expect(setTripDates(t, '', '2026-03-02')).toBe(t);
  });
});

describe('overrides', () => {
  it('sets and clears single fields, dropping empty overrides', () => {
    let t = setDayOverride(draft(), '2026-03-01', { amountCents: 4500 });
    t = setDayOverride(t, '2026-03-01', { status: 'layover' });
    expect(t.dayOverrides['2026-03-01']).toEqual({ amountCents: 4500, status: 'layover' });
    t = setDayOverride(t, '2026-03-01', { amountCents: undefined, status: undefined });
    expect(t.dayOverrides).toEqual({});
  });

  it('the trip-level Dom/Intl toggle clears per-night flips but keeps other overrides', () => {
    let t = setTripDates(draft(), '2026-03-01', '2026-03-04');
    t = setDayOverride(t, '2026-03-02', { loc: 'international' });
    t = setDayOverride(t, '2026-03-03', { loc: 'international', amountCents: 1 });
    t = setTripLoc(t, 'international');
    expect(t.defaultLoc).toBe('international');
    expect(t.dayOverrides).toEqual({ '2026-03-03': { amountCents: 1 } });
  });
});

describe('validateTrip', () => {
  it('requires trip number and tail', () => {
    expect(validateTrip({ ...draft(), tail: ' ' })).toEqual({
      tripNumber: 'Enter the trip number',
      tail: 'Enter the tail number',
    });
    expect(validateTrip({ ...draft(), tripNumber: 'TEST01' })).toEqual({});
  });
});

describe('prepareTripForSave', () => {
  it('trims, uppercases, and drops overrides outside the new dates', () => {
    let t = setTripDates(draft(), '2026-03-01', '2026-03-05');
    t = setDayOverride(t, '2026-03-05', { status: 'layover' });
    t = setDayOverride(t, '2026-03-02', { amountCents: 100 });
    t = setTripDates(t, '2026-03-01', '2026-03-03');
    const saved = prepareTripForSave(
      { ...t, tripNumber: ' test01 ', tail: 'n000ts', customer: '  ', notes: ' hi ' },
      2000,
    );
    expect(saved).toMatchObject({
      tripNumber: 'TEST01',
      tail: 'N000TS',
      notes: 'hi',
      updatedAt: 2000,
    });
    expect(saved.customer).toBeUndefined();
    expect(saved.dayOverrides).toEqual({ '2026-03-02': { amountCents: 100 } });
  });
});

describe('tripTotals', () => {
  it('adds per diem and soft days for one trip', () => {
    const t = setTripDates(draft(), '2026-03-01', '2026-03-03');
    expect(tripTotals(t, ['2026-03-02', '2026-03-09'], settings)).toEqual({
      days: 3,
      perDiemCents: 24000,
      softDayCount: 1,
      softDayCents: 60000,
    });
  });
});
