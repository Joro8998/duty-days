import { datesInMonth, shortDate, weekday } from '../lib/dates';
import { LOC_LABELS } from '../lib/labels';
import type { DayResult } from '../lib/types';

export type CalendarMode = 'trips' | 'daysOff';

interface Props {
  month: string;
  days: DayResult[];
  daysOff: string[];
  today: string;
  mode: CalendarMode;
  onTapDay: (date: string) => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Calendar({ month, days, daysOff, today, mode, onTapDay }: Props) {
  const dutyByDate = new Map(days.map((d) => [d.date, d]));
  const off = new Set(daysOff);
  const dates = datesInMonth(month);
  const leadingBlanks = weekday(dates[0]!);

  return (
    <div className={`calendar mode-${mode}`}>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {dates.map((date) => {
          const duty = dutyByDate.get(date);
          const isOff = off.has(date);
          const classes = ['day'];
          const label = [shortDate(date)];

          if (duty) {
            classes.push(duty.loc === 'international' ? 'trip-intl' : 'trip-dom');
            label.push(`${LOC_LABELS[duty.loc]} trip ${duty.tripNumber}`);
          }
          if (isOff) {
            classes.push(duty ? 'worked-off' : 'off');
            label.push(duty ? 'worked day off' : 'day off');
          }
          if (date === today) {
            classes.push('today');
            label.push('today');
          }

          return (
            <button
              key={date}
              type="button"
              className={classes.join(' ')}
              aria-label={label.join(', ')}
              aria-pressed={mode === 'daysOff' ? isOff : undefined}
              onClick={() => onTapDay(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <ul className="calendar-legend" aria-hidden="true">
        <li>
          <span className="swatch trip-dom" /> Domestic
        </li>
        <li>
          <span className="swatch trip-intl" /> International
        </li>
        <li>
          <span className="swatch off" /> Day off
        </li>
        <li>
          <span className="swatch worked-off" /> Worked day off
        </li>
      </ul>
    </div>
  );
}
