// Data model (SPEC.md section 4).

export interface Settings {
  pilotName: string;
  base: string;
  hourlyRateCents: number;
  multiplier: number;
  softDayHours: number;
  domesticCents: number;
  internationalCents: number;
  defaultTail: string;
  accountingEmail?: string;
}

export type TripKind = 'charter' | 'training' | 'positioning' | 'pickup';
export type LocType = 'domestic' | 'international';
export type DayStatus = 'flying' | 'layover';

export interface DayOverride {
  /** Flips a single night. Ignored on the return day and on same-day trips. */
  loc?: LocType;
  status?: DayStatus;
  /** Manual per diem amount. Always wins. */
  amountCents?: number;
}

export interface Trip {
  id: string;
  startDate: string;
  endDate: string;
  tripNumber: string;
  tail: string;
  kind: TripKind;
  defaultLoc: LocType;
  customer?: string;
  notes?: string;
  dayOverrides: Record<string, DayOverride>;
  createdAt: number;
  updatedAt: number;
}

export interface MonthDaysOff {
  month: string;
  dates: string[];
}

export interface DayResult {
  date: string;
  tripIds: string[];
  /** The trip whose amount was paid when several trips share the date. */
  paidTripId: string;
  tripNumber: string;
  tail: string;
  loc: LocType;
  status: DayStatus;
  perDiemCents: number;
  isDayOff: boolean;
  softDayCents: number;
}

export interface MonthResult {
  month: string;
  days: DayResult[];
  daysOff: string[];
  perDiemTotalCents: number;
  domesticDays: number;
  internationalDays: number;
  softDayCount: number;
  softDayRateCents: number;
  softDayTotalCents: number;
  carryNotes: string[];
}
