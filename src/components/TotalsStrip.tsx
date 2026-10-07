import { formatCents } from '../lib/money';
import type { MonthResult } from '../lib/types';

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export function TotalsStrip({ result }: { result: MonthResult }) {
  return (
    <div className="totals">
      <div className="total">
        <span className="total-label">Per Diem</span>
        <span className="total-amount">{formatCents(result.perDiemTotalCents)}</span>
        <span className="total-days">{days(result.days.length)}</span>
      </div>
      <div className={`total${result.softDayCount > 0 ? ' has-soft' : ''}`}>
        <span className="total-label">Soft Day</span>
        <span className="total-amount">{formatCents(result.softDayTotalCents)}</span>
        <span className="total-days">{days(result.softDayCount)}</span>
      </div>
    </div>
  );
}
