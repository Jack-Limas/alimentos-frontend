// CustomerDTO from alimentos-backend (contract 4.5), typed from a real response.

export const CUSTOMER_TYPES = [
  'SUPERMARKET',
  'RESTAURANT',
  'SCHOOL',
  'HOSPITAL',
  'FOOD_BANK',
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  address: string;
  phone: string | null;
  email: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  type: CustomerType;
  address: string;
  phone?: string;
  email?: string;
}

/** PATCH body: null clears phone or email. */
export interface CustomerPatch {
  name?: string;
  type?: CustomerType;
  address?: string;
  phone?: string | null;
  email?: string | null;
  status?: CustomerStatus;
}
