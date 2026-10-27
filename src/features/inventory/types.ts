import type { CalendarDate } from '@/lib/dates';

// Shapes of the backend responses (alimentos-backend, contract sections 4.3 and 4.4),
// typed from real responses of the local API.

export const UNITS = ['KG', 'L', 'UNIT', 'BOX'] as const;
export type Unit = (typeof UNITS)[number];

export const MOVEMENT_TYPES = [
  'ENTRY',
  'EXIT_DISPATCH',
  'EXIT_WASTE',
  'ADJUSTMENT',
  'RETURN',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Exits a user can register by hand (dispatches come from orders). */
export const MANUAL_EXIT_TYPES = ['EXIT_WASTE', 'ADJUSTMENT'] as const;
export type ManualExitType = (typeof MANUAL_EXIT_TYPES)[number];

export const REASON_CODES = [
  'OUT_OF_STOCK',
  'BELOW_MIN_STOCK',
  'EXPIRES_IN_DAYS',
  'EXPIRED_STOCK',
  'NO_RECENT_OUTFLOW',
  'COVERAGE_EXCEEDS_EXPIRY',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

/** Explanation as code + params; the UI translates it, the server never sends text. */
export interface Reason {
  code: string;
  params: Record<string, number>;
}

export interface Lot {
  id: string;
  productId: string;
  lotCode: string | null;
  quantity: number;
  initialQuantity: number;
  expiryDate: CalendarDate;
  /** ISO instant. */
  receivedAt: string;
  /** Days from today (Bogota) to the expiry date; negative once expired. */
  daysToExpiry: number;
  expired: boolean;
}

export interface Movement {
  id: string;
  lotId: string;
  productId: string;
  type: MovementType;
  /** Always positive; the type gives the direction. */
  quantity: number;
  reason: string | null;
  orderId: string | null;
  userId: string;
  createdAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  wasteRiskHigh: number;
}

export interface EntryInput {
  productId: string;
  quantity: number;
  expiryDate: CalendarDate;
  lotCode?: string;
  note?: string;
}

export interface ExitInput {
  productId: string;
  quantity: number;
  type: ManualExitType;
  lotId?: string;
  reason: string;
}

export interface ExitResult {
  allocations: { lotId: string; qty: number }[];
  movements: Movement[];
}
