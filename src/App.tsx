import { lazy, Suspense, useState } from 'react';
import { getSettings } from './db/settings';
import { useLiveQuery } from './db/useLiveQuery';
import { monthOf, today } from './lib/dates';
import { tripMonths } from './lib/pay';
import { Month } from './screens/Month';
import { Setup } from './screens/Setup';
import { SettingsScreen } from './screens/SettingsScreen';
import { TripEditor } from './screens/TripEditor';
import { Year } from './screens/Year';

// jsPDF is large; load the export screen (and the PDF code) only when it's opened.
const Export = lazy(() => import('./screens/Export').then((m) => ({ default: m.Export })));

type Screen =
  | { name: 'month' }
  | { name: 'settings' }
  | { name: 'trip'; tripId?: string; startDate?: string }
  | { name: 'export' }
  | { name: 'year'; year: string };

export default function App() {
  const settings = useLiveQuery(getSettings, []);
  const [screen, setScreen] = useState<Screen>({ name: 'month' });
  const [month, setMonth] = useState(() => monthOf(today()));
  const backToMonth = () => setScreen({ name: 'month' });

  if (settings.status === 'loading') return null;
  if (settings.value === null) return <Setup />;

  switch (screen.name) {
    case 'settings':
      return <SettingsScreen settings={settings.value} onBack={backToMonth} />;
    case 'trip':
      return (
        <TripEditor
          key={screen.tripId ?? screen.startDate}
          tripId={screen.tripId}
          startDate={screen.startDate}
          settings={settings.value}
          onClose={backToMonth}
          onSaved={(trip) => {
            // Show the saved trip: jump to its month if it isn't in the one being viewed.
            if (!tripMonths(trip).includes(month)) setMonth(monthOf(trip.startDate));
            backToMonth();
          }}
        />
      );
    case 'export':
      return (
        <Suspense fallback={null}>
          <Export month={month} settings={settings.value} onBack={backToMonth} />
        </Suspense>
      );
    case 'year':
      return (
        <Year
          year={screen.year}
          settings={settings.value}
          onChangeYear={(year) => setScreen({ name: 'year', year })}
          onOpenMonth={(m) => {
            setMonth(m);
            backToMonth();
          }}
          onBack={backToMonth}
        />
      );
    case 'month':
      return (
        <Month
          settings={settings.value}
          month={month}
          onChangeMonth={setMonth}
          onOpenTrip={(tripId) => setScreen({ name: 'trip', tripId })}
          onNewTrip={(startDate) => setScreen({ name: 'trip', startDate })}
          onExport={() => setScreen({ name: 'export' })}
          onExportMonth={(m) => {
            setMonth(m);
            setScreen({ name: 'export' });
          }}
          onYear={() => setScreen({ name: 'year', year: month.slice(0, 4) })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      );
  }
}
