import type { DayStatus, LocType, TripKind } from './types';

export const KIND_LABELS: Record<TripKind, string> = {
  charter: 'Charter',
  training: 'Training',
  positioning: 'Positioning',
  pickup: 'Aircraft pickup',
};

export const LOC_LABELS: Record<LocType, string> = {
  domestic: 'Domestic',
  international: 'International',
};

export const LOC_SHORT: Record<LocType, string> = {
  domestic: 'Dom',
  international: 'Intl',
};

export const STATUS_LABELS: Record<DayStatus, string> = {
  flying: 'Flying',
  layover: 'Layover',
};
