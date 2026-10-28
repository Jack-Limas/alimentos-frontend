import type { CustomerType } from '@/features/customers/types';
import type { Unit } from '@/features/inventory/types';
import type { CalendarDate } from '@/lib/dates';

// OrderDTO from alimentos-backend (contract 4.6), typed from real responses.

export const ORDER_STATUSES = [
  'PENDING',
  'IN_PREPARATION',
  'READY_FOR_DISPATCH',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Lowest to highest. */
export const ORDER_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export interface Order {
  id: string;
  /** "PED-000123". */
  code: string;
  number: number;
  customer: { id: string; name: string; type: CustomerType };
  status: OrderStatus;
  priority: OrderPriority;
  dueDate: CalendarDate;
  notes: string | null;
  itemCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  requestedQty: number;
  allocatedQty: number;
}

export interface OrderHistoryEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  userId: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  /** Oldest first. */
  history: OrderHistoryEntry[];
}

export interface OrderInput {
  customerId: string;
  priority: OrderPriority;
  dueDate: CalendarDate;
  notes?: string;
  items: { productId: string; quantity: number }[];
}
