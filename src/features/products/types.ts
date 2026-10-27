import type { Lot, Reason, Unit } from '@/features/inventory/types';
import type { CalendarDate } from '@/lib/dates';

export const CATEGORIES = [
  'FRUITS_VEGETABLES',
  'DAIRY',
  'MEAT_POULTRY',
  'FISH',
  'BAKERY',
  'GRAINS_LEGUMES',
  'CANNED',
  'BEVERAGES',
  'FROZEN',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type StockStatus = 'OK' | 'LOW' | 'OUT';
export type WasteRisk = 'NONE' | 'LOW' | 'HIGH';

/** ProductDTO: stored fields plus the figures the server computes. */
export interface Product {
  id: string;
  name: string;
  category: Category;
  unit: Unit;
  minStock: number;
  status: ProductStatus;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  availableQty: number;
  expiredQty: number;
  nearestExpiry: CalendarDate | null;
  daysToNearestExpiry: number | null;
  stockStatus: StockStatus;
  avgDailyOut30d: number;
  coverageDays: number | null;
  wasteRisk: WasteRisk;
  reasons: Reason[];
}

export interface ProductDetail extends Product {
  /** Lots with stock in FEFO order (expired ones included). */
  lots: Lot[];
}

export interface ProductInput {
  name: string;
  category: Category;
  unit: Unit;
  minStock: number;
}

export type ProductPatch = Partial<ProductInput> & { status?: ProductStatus };
