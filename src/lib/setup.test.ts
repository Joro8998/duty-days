import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('runs in America/New_York so UTC date shifts would be caught', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
    // The classic bug: parsing a date-only string as UTC lands on the previous local day.
    expect(new Date('2026-09-07').getDate()).toBe(6);
  });
});
