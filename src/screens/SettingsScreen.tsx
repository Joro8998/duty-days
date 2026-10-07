import { BackupSection } from '../components/BackupSection';
import { SettingsForm } from '../components/SettingsForm';
import { saveSettings } from '../db/settings';
import type { Settings } from '../lib/types';

interface Props {
  settings: Settings;
  onBack: () => void;
}

export function SettingsScreen({ settings, onBack }: Props) {
  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="button link back" onClick={onBack}>
          ‹ Back
        </button>
        <h1>Settings</h1>
      </header>
      <BackupSection />
      <SettingsForm initial={settings} submitLabel="Save" showAdvanced onSave={saveSettings} />
      <p className="app-version">Duty Days v{__APP_VERSION__}</p>
    </main>
  );
}
