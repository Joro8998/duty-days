import { useMemo } from 'react';
import { daysOffForYear } from '../db/daysOff';
import { tripsForYear } from '../db/trips';
import { useLiveQuery } from '../db/useLiveQuery';
import { monthName, monthOf, today } from '../lib/dates';
import { formatCents } from '../lib/money';
import { calculateYear } from '../lib/pay';
import type { Settings } from '../lib/types';

interface Props {
  year: string;
  settings: Settings;
  onChangeYear: (year: string) => void;
  onOpenMonth: (month: string) => void;
  onBack: () => void;
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export function Year({ year, settings, onChangeYear, onOpenMonth, onBack }: Props) {
  const data = useLiveQuery(async () => {
    const [trips, daysOff] = await Promise.all([tripsForYear(year), daysOffForYear(year)]);
    return { trips, daysOff };
  }, [year]);

  const result = useMemo(
    () =>
      data.status === 'ready'
        ? calculateYear(year, data.value.trips, data.value.daysOff, settings)
        : null,
    [data, year, settings],
  );

  const currentMonth = monthOf(today());
  const step = (n: number) => onChangeYear(String(Number(year) + n));

  return (
    <main className="screen">
      <header className="month-header">
        <button type="button" className="button link back" onClick={onBack}>
          ‹ Month
        </button>
        <button
          type="button"
          className="button icon"
          aria-label="Previous year"
          onClick={() => step(-1)}
        >
          ‹
        </button>
        <h1 className="month-title year-title">{year}</h1>
        <button
          type="button"
          className="button icon"
          aria-label="Next year"
          onClick={() => step(1)}
        >
          ›
        </button>
        <span className="header-spacer" />
      </header>

      {result && (
        <>
          <div className="totals">
            <div className="total">
              <span className="total-label">Per Diem</span>
              <span className="total-amount">{formatCents(result.perDiemTotalCents)}</span>
              <span className="total-days">
                {days(result.dutyDays)} · {result.domesticDays} dom · {result.internationalDays}{' '}
                intl
              </span>
            </div>
            <div className={`total${result.softDayCount > 0 ? ' has-soft' : ''}`}>
              <span className="total-label">Soft Day</span>
              <span className="total-amount">{formatCents(result.softDayTotalCents)}</span>
              <span className="total-days">{days(result.softDayCount)}</span>
            </div>
          </div>

          <div className="year-total">
            <span>Year total</span>
            <strong>{formatCents(result.totalCents)}</strong>
          </div>

          <h2 className="section-title">By month</h2>
          <ul className="trip-list year-months">
            {result.months.map((m) => {
              const empty = m.days.length === 0 && m.softDayCount === 0;
              return (
                <li key={m.month}>
                  <button
                    type="button"
                    className={`trip-row${empty ? ' empty-month' : ''}${m.month === currentMonth ? ' current-month' : ''}`}
                    onClick={() => onOpenMonth(m.month)}
                  >
                    <span className="trip-main">
                      <span className="trip-dates">{monthName(m.month)}</span>
                      <span className="trip-meta">
                        {empty
                          ? 'No duty days'
                          : `${days(m.days.length)}${m.softDayCount > 0 ? ` · soft ${formatCents(m.softDayTotalCents)} (${m.softDayCount})` : ''}`}
                      </span>
                    </span>
                    <span className="trip-amount">{formatCents(m.perDiemTotalCents)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="field-hint year-hint">
            Per diem by month, as on each month’s forms. Tap a month to open it.
          </p>
        </>
      )}
    </main>
  );
}
