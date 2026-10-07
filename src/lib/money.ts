// Converting between typed dollar amounts and integer cents. Formatting only — no pay rules.

/** '50.25', '$1,120', '.5' → cents. Returns null if it isn't a valid amount (max 2 decimals). */
export function parseDollarsToCents(input: string): number | null {
  const s = input.trim().replace(/^\$/, '').replace(/,/g, '');
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(s);
  if (!match || s === '' || s === '.') return null;
  const whole = match[1] || '0';
  const frac = (match[2] ?? '').padEnd(2, '0');
  return Number(whole) * 100 + Number(frac);
}

/** 60000 → '$600.00', 112000 → '$1,120.00' */
export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const rest = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}$${dollars}.${rest}`;
}

/** 5025 → '50.25' (for prefilling inputs) */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
