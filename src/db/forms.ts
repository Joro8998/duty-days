import { db } from './db';

const SENT_KEY = 'sentMonths';

/** Months ('YYYY-MM') whose PDFs were emailed, downloaded, or marked sent. */
export async function getSentMonths(): Promise<Set<string>> {
  const row = await db.meta.get(SENT_KEY);
  const months = Array.isArray(row?.value) ? row.value : [];
  return new Set(months.filter((m): m is string => typeof m === 'string'));
}

export async function markMonthSent(month: string): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const months = await getSentMonths();
    months.add(month);
    await db.meta.put({ key: SENT_KEY, value: [...months].sort() });
  });
}
