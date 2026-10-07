import { useState, type FormEvent } from 'react';
import { shortDate, weekdayName } from '../lib/dates';
import { LOC_LABELS, LOC_SHORT, STATUS_LABELS } from '../lib/labels';
import { centsToInput, formatCents, parseDollarsToCents } from '../lib/money';
import type { TripDay } from '../lib/pay';
import type { DayOverride, LocType } from '../lib/types';

interface Props {
  days: TripDay[];
  daysOff: Set<string>;
  tripLoc: LocType;
  onChange: (date: string, patch: DayOverride) => void;
}

const flipLoc = (loc: LocType): LocType => (loc === 'domestic' ? 'international' : 'domestic');

export function DayList({ days, daysOff, tripLoc, onChange }: Props) {
  const [editing, setEditing] = useState<{ date: string; value: string; invalid: boolean } | null>(
    null,
  );

  function submitAmount(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const cents = parseDollarsToCents(editing.value);
    if (cents === null) {
      setEditing({ ...editing, invalid: true });
      return;
    }
    onChange(editing.date, { amountCents: cents });
    setEditing(null);
  }

  return (
    <ul className="day-list">
      {days.map((d) => {
        const isOff = daysOff.has(d.date);
        const nextStatus = d.status === 'flying' ? 'layover' : 'flying';
        const nextLoc = flipLoc(d.loc);

        return (
          <li key={d.date} className={`day-row${isOff ? ' is-off' : ''}`}>
            <div className="day-row-main">
              <div className="day-row-date">
                <strong>{shortDate(d.date)}</strong>
                <span>{weekdayName(d.date).slice(0, 3)}</span>
                {isOff && <span className="badge">Day off</span>}
              </div>

              <button
                type="button"
                className="chip"
                aria-label={`${STATUS_LABELS[d.status]}. Tap for ${STATUS_LABELS[nextStatus]}.`}
                onClick={() =>
                  onChange(d.date, {
                    status: nextStatus === d.defaultStatus ? undefined : nextStatus,
                  })
                }
              >
                {STATUS_LABELS[d.status]}
              </button>

              {d.locEditable ? (
                <button
                  type="button"
                  className={`chip loc-${d.loc}`}
                  aria-label={`${LOC_LABELS[d.loc]} night. Tap for ${LOC_LABELS[nextLoc]}.`}
                  onClick={() =>
                    onChange(d.date, { loc: nextLoc === tripLoc ? undefined : nextLoc })
                  }
                >
                  {LOC_SHORT[d.loc]}
                </button>
              ) : (
                <span
                  className={`chip static loc-${d.loc}`}
                  title={
                    days.length === 1 ? 'Same-day trips are Domestic' : 'Follows the night before'
                  }
                >
                  {LOC_SHORT[d.loc]}
                </span>
              )}

              <button
                type="button"
                className={`day-amount${d.isManualAmount ? ' manual' : ''}`}
                aria-label={`${formatCents(d.perDiemCents)}${d.isManualAmount ? ', set by hand' : ''}. Tap to change.`}
                onClick={() =>
                  setEditing({ date: d.date, value: centsToInput(d.perDiemCents), invalid: false })
                }
              >
                {formatCents(d.perDiemCents)}
                {d.isManualAmount && <span aria-hidden="true"> ✎</span>}
              </button>
            </div>

            {editing?.date === d.date && (
              <form className="amount-editor" onSubmit={submitAmount}>
                <span className="field-prefix">$</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  aria-label={`Per diem for ${shortDate(d.date)}`}
                  aria-invalid={editing.invalid}
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: e.target.value, invalid: false })
                  }
                />
                <button type="submit" className="button small">
                  Set
                </button>
                {d.isManualAmount && (
                  <button
                    type="button"
                    className="button link"
                    onClick={() => {
                      onChange(d.date, { amountCents: undefined });
                      setEditing(null);
                    }}
                  >
                    Auto
                  </button>
                )}
                <button type="button" className="button link" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
