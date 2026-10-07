import { dateRangeLabel } from '../lib/dates';
import { KIND_LABELS, LOC_SHORT } from '../lib/labels';
import { formatCents } from '../lib/money';
import { perDiemByTrip, tripDays } from '../lib/pay';
import type { MonthResult, Settings, Trip } from '../lib/types';

interface Props {
  trips: Trip[];
  result: MonthResult;
  settings: Settings;
  onOpen: (tripId: string) => void;
}

export function TripList({ trips, result, settings, onOpen }: Props) {
  if (trips.length === 0) {
    return <p className="empty">No trips this month. Tap a day or “+ Add trip”.</p>;
  }

  const amounts = perDiemByTrip(result);

  return (
    <ul className="trip-list">
      {trips.map((trip) => {
        const locs = new Set(tripDays(trip, settings).map((d) => d.loc));
        const locLabel = locs.size > 1 ? 'Mixed' : LOC_SHORT[[...locs][0]!];
        return (
          <li key={trip.id}>
            <button type="button" className="trip-row" onClick={() => onOpen(trip.id)}>
              <span className="trip-main">
                <span className="trip-dates">{dateRangeLabel(trip.startDate, trip.endDate)}</span>
                <span className="trip-meta">
                  {trip.tripNumber} · {KIND_LABELS[trip.kind]} · {locLabel}
                </span>
              </span>
              <span className="trip-amount">{formatCents(amounts.get(trip.id) ?? 0)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
