import { describe, expect, it } from 'vitest';
import { centsToInput, formatCents, parseDollarsToCents } from './money';

describe('parseDollarsToCents', () => {
  it('reads common ways of typing an amount', () => {
    expect(parseDollarsToCents('50')).toBe(5000);
    expect(parseDollarsToCents('50.5')).toBe(5050);
    expect(parseDollarsToCents('50.05')).toBe(5005);
    expect(parseDollarsToCents(' $1,120.00 ')).toBe(112000);
    expect(parseDollarsToCents('.5')).toBe(50);
    expect(parseDollarsToCents('0')).toBe(0);
  });

  it('does not lose cents to float math', () => {
    expect(parseDollarsToCents('0.29')).toBe(29);
    expect(parseDollarsToCents('68.27')).toBe(6827);
  });

  it('rejects junk', () => {
    for (const bad of ['', '.', 'abc', '1.234', '-5', '1.2.3', '$']) {
      expect(parseDollarsToCents(bad)).toBeNull();
    }
  });
});

describe('formatCents', () => {
  it('formats dollars with commas and two decimals', () => {
    expect(formatCents(81928)).toBe('$819.28');
    expect(formatCents(112000)).toBe('$1,120.00');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(0)).toBe('$0.00');
  });
});

describe('centsToInput', () => {
  it('round-trips with parseDollarsToCents', () => {
    for (const cents of [0, 5, 5000, 6827, 10000]) {
      expect(parseDollarsToCents(centsToInput(cents))).toBe(cents);
    }
  });
});
