import type { Settings } from '../lib/types';
import { db, type SettingsRow } from './db';

/** Starting values for the setup screen. Personal fields are left blank on purpose. */
export const DEFAULT_SETTINGS: Settings = {
  pilotName: '',
  base: 'KFXE',
  hourlyRateCents: 0,
  multiplier: 1.5,
  softDayHours: 8,
  domesticCents: 8000,
  internationalCents: 10000,
  defaultTail: '',
};

/** The saved settings, or null before first-run setup. */
export async function getSettings(): Promise<Settings | null> {
  const row = await db.settings.get('main');
  if (!row) return null;
  const settings: Partial<SettingsRow> = { ...row };
  delete settings.id;
  return settings as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, id: 'main' });
}

/** Ask the browser not to evict our data under storage pressure (SPEC.md section 7). */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported or refused — the app still works.
  }
}
