import { RestoreButton } from '../components/RestoreButton';
import { SettingsForm } from '../components/SettingsForm';
import { DEFAULT_SETTINGS, requestPersistentStorage, saveSettings } from '../db/settings';
import type { Settings } from '../lib/types';

export function Setup() {
  async function handleSave(settings: Settings) {
    await saveSettings(settings);
    await requestPersistentStorage();
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Welcome to Duty Days</h1>
      </header>
      <p className="lead">
        A few details to get started. They stay on this phone and are never uploaded.
      </p>
      <p className="note">
        Tip: add the app to your Home Screen <em>before</em> entering data. The Home Screen app
        keeps its own storage, separate from Safari.
      </p>
      <section className="setup-restore">
        <p className="field-hint">Reinstalling, or moving from another device?</p>
        <RestoreButton
          label="Restore from a backup"
          replacesData={false}
          onRestored={requestPersistentStorage}
        />
      </section>
      <SettingsForm initial={DEFAULT_SETTINGS} submitLabel="Get started" onSave={handleSave} />
    </main>
  );
}
