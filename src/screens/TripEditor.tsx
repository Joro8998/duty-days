import { useMemo, useState } from 'react';
import { DayList } from '../components/DayList';
import { Field } from '../components/Field';
import { daysOffForMonth } from '../db/daysOff';
import { deleteTrip, getTrip, overlappingTrips, saveTrip } from '../db/trips';
import { useLiveQuery } from '../db/useLiveQuery';
import { dateRangeLabel } from '../lib/dates';
import { KIND_LABELS } from '../lib/labels';
import { formatCents } from '../lib/money';
import { tripDays, tripMonths, tripTotals } from '../lib/pay';
import {
  newTripDraft,
  prepareTripForSave,
  setDayOverride,
  setTripDates,
  setTripLoc,
  validateTrip,
  type TripErrors,
} from '../lib/trips';
import type { Settings, Trip, TripKind } from '../lib/types';

interface Props {
  tripId?: string;
  startDate?: string;
  settings: Settings;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}

/** Loads the trip (when editing) and hands it to the form. */
export function TripEditor({ tripId, startDate, settings, onClose, onSaved }: Props) {
  const [newDraft] = useState(() => (tripId ? null : newTripDraft(startDate ?? '', settings)));
  const existing = useLiveQuery(() => (tripId ? getTrip(tripId) : Promise.resolve(null)), [tripId]);

  if (newDraft) {
    return (
      <TripForm initial={newDraft} isNew settings={settings} onClose={onClose} onSaved={onSaved} />
    );
  }
  if (existing.status === 'loading') return null;
  if (!existing.value) {
    return (
      <main className="screen">
        <header className="screen-header">
          <button type="button" className="button link back" onClick={onClose}>
            ‹ Back
          </button>
        </header>
        <p className="note">This trip no longer exists.</p>
      </main>
    );
  }
  return (
    <TripForm
      initial={existing.value}
      isNew={false}
      settings={settings}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

interface FormProps {
  initial: Trip;
  isNew: boolean;
  settings: Settings;
  onClose: () => void;
  onSaved: (trip: Trip) => void;
}

function TripForm({ initial, isNew, settings, onClose, onSaved }: FormProps) {
  const [trip, setTrip] = useState(initial);
  const [errors, setErrors] = useState<TripErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const context = useLiveQuery(async () => {
    const [daysOff, others] = await Promise.all([
      Promise.all(tripMonths(trip).map(daysOffForMonth)).then((lists) => lists.flat()),
      overlappingTrips(trip.startDate, trip.endDate, trip.id),
    ]);
    return { daysOff, others };
  }, [trip.startDate, trip.endDate, trip.id]);

  const daysOff = context.status === 'ready' ? context.value.daysOff : [];
  const others = context.status === 'ready' ? context.value.others : [];
  const days = useMemo(() => tripDays(trip, settings), [trip, settings]);
  const totals = tripTotals(trip, daysOff, settings);

  const update = (patch: Partial<Trip>) => setTrip((t) => ({ ...t, ...patch }));

  async function handleSave() {
    const found = validateTrip(trip);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const saved = prepareTripForSave(trip);
      await saveTrip(saved);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteTrip(trip.id);
    onClose();
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <button type="button" className="button link back" onClick={onClose}>
          Cancel
        </button>
        <h1 className="screen-title">{isNew ? 'New trip' : 'Edit trip'}</h1>
        <button type="button" className="button link strong" disabled={saving} onClick={handleSave}>
          Save
        </button>
      </header>

      <div className="form">
        <fieldset>
          <legend>Trip</legend>
          <div className="field-pair">
            <Field label="Start" error={errors.dates}>
              {(id) => (
                <input
                  id={id}
                  type="date"
                  value={trip.startDate}
                  onChange={(e) => setTrip((t) => setTripDates(t, e.target.value, t.endDate))}
                />
              )}
            </Field>
            <Field label="Return">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  min={trip.startDate}
                  value={trip.endDate}
                  onChange={(e) => setTrip((t) => setTripDates(t, t.startDate, e.target.value))}
                />
              )}
            </Field>
          </div>
          <div className="field-pair">
            <Field label="Trip #" error={errors.tripNumber}>
              {(id) => (
                <input
                  id={id}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={trip.tripNumber}
                  onChange={(e) => update({ tripNumber: e.target.value })}
                />
              )}
            </Field>
            <Field label="Tail" error={errors.tail}>
              {(id) => (
                <input
                  id={id}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={trip.tail}
                  onChange={(e) => update({ tail: e.target.value })}
                />
              )}
            </Field>
          </div>
          <Field label="Kind">
            {(id) => (
              <select
                id={id}
                value={trip.kind}
                onChange={(e) => update({ kind: e.target.value as TripKind })}
              >
                {Object.entries(KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="field">
            <span className="field-label">Where you overnight</span>
            <div className="segmented" role="radiogroup" aria-label="Domestic or International">
              {(['domestic', 'international'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  role="radio"
                  aria-checked={trip.defaultLoc === loc}
                  className={`loc-${loc}`}
                  onClick={() => setTrip((t) => setTripLoc(t, loc))}
                >
                  {loc === 'domestic' ? 'Domestic' : 'International'}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        {others.length > 0 && (
          <p className="warning" role="status">
            Overlaps{' '}
            {others
              .map((o) => `trip ${o.tripNumber} (${dateRangeLabel(o.startDate, o.endDate)})`)
              .join(', ')}
            . Shared dates are paid once, at the higher rate.
          </p>
        )}

        <h2 className="section-title">Days</h2>
        <DayList
          days={days}
          daysOff={new Set(daysOff)}
          tripLoc={trip.defaultLoc}
          onChange={(date, patch) => setTrip((t) => setDayOverride(t, date, patch))}
        />
        <p className="field-hint day-list-hint">
          Tap Flying/Layover or Dom/Intl to change a single day. Tap an amount to set it by hand.
        </p>

        <div className="trip-totals">
          <div>
            <span className="total-label">
              Per diem · {totals.days} {totals.days === 1 ? 'day' : 'days'}
            </span>
            <strong>{formatCents(totals.perDiemCents)}</strong>
          </div>
          <div className={totals.softDayCount > 0 ? 'has-soft' : undefined}>
            <span className="total-label">
              Soft day · {totals.softDayCount} {totals.softDayCount === 1 ? 'day' : 'days'}
            </span>
            <strong>{formatCents(totals.softDayCents)}</strong>
          </div>
        </div>

        <fieldset>
          <legend>Optional</legend>
          <Field label="Customer">
            {(id) => (
              <input
                id={id}
                value={trip.customer ?? ''}
                onChange={(e) => update({ customer: e.target.value })}
              />
            )}
          </Field>
          <Field label="Notes">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={trip.notes ?? ''}
                onChange={(e) => update({ notes: e.target.value })}
              />
            )}
          </Field>
        </fieldset>

        <button type="button" className="button primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save trip'}
        </button>

        {!isNew && (
          <button type="button" className="button danger" onClick={handleDelete}>
            {confirmDelete ? 'Tap again to delete this trip' : 'Delete trip'}
          </button>
        )}
      </div>
    </main>
  );
}
