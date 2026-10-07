import { useState } from 'react';
import { Calendar, type CalendarMode } from '../components/Calendar';
import { TotalsStrip } from '../components/TotalsStrip';
import { TripList } from '../components/TripList';
import { toggleDayOff } from '../db/daysOff';
import { useMonthData } from '../db/useMonthData';
import { addMonths, monthLabel, monthOf, today as getToday } from '../lib/dates';
import type { Settings } from '../lib/types';

interface Props {
  settings: Settings;
  month: string;
  onChangeMonth: (month: string) => void;
  onOpenTrip: (tripId: string) => void;
  onNewTrip: (startDate: string) => void;
  onExport: () => void;
  onSettings: () => void;
}

export function Month(props: Props) {
  const { settings, month, onChangeMonth, onOpenTrip, onNewTrip } = props;
  const [mode, setMode] = useState<CalendarMode>('trips');
  const today = getToday();

  const data = useMonthData(month, settings);
  const result = data?.result;

  function handleTapDay(date: string) {
    if (mode === 'daysOff') {
      void toggleDayOff(date);
      return;
    }
    const duty = result?.days.find((d) => d.date === date);
    if (duty) onOpenTrip(duty.tripIds[0]!);
    else onNewTrip(date);
  }

  const newTripDate = monthOf(today) === month ? today : `${month}-01`;

  return (
    <main className="screen">
      <header className="month-header">
        <button
          type="button"
          className="button icon"
          aria-label="Previous month"
          onClick={() => onChangeMonth(addMonths(month, -1))}
        >
          ‹
        </button>
        <button
          type="button"
          className="month-title"
          aria-label={`${monthLabel(month)}. Tap for this month.`}
          onClick={() => onChangeMonth(monthOf(today))}
        >
          {monthLabel(month)}
        </button>
        <button
          type="button"
          className="button icon"
          aria-label="Next month"
          onClick={() => onChangeMonth(addMonths(month, 1))}
        >
          ›
        </button>
        <button type="button" className="button link settings-link" onClick={props.onSettings}>
          Settings
        </button>
      </header>

      {data && result && (
        <>
          <TotalsStrip result={result} />

          <div className="segmented" role="tablist" aria-label="Calendar mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'trips'}
              onClick={() => setMode('trips')}
            >
              Trips
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'daysOff'}
              onClick={() => setMode('daysOff')}
            >
              Days off
            </button>
          </div>

          {mode === 'daysOff' && (
            <div className="mode-banner">
              <span>Tap the days you’re scheduled off.</span>
              <button type="button" className="button small" onClick={() => setMode('trips')}>
                Done
              </button>
            </div>
          )}

          <Calendar
            month={month}
            days={result.days}
            daysOff={data.daysOff}
            today={today}
            mode={mode}
            onTapDay={handleTapDay}
          />

          <div className="actions">
            <button type="button" className="button primary" onClick={() => onNewTrip(newTripDate)}>
              + Add trip
            </button>
            <button type="button" className="button secondary" onClick={props.onExport}>
              Make PDFs
            </button>
          </div>

          <h2 className="section-title">Trips</h2>
          <TripList trips={data.trips} result={result} settings={settings} onOpen={onOpenTrip} />
        </>
      )}
    </main>
  );
}
