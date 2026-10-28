import { ROLES, type Role } from '@/features/auth/types';

export type NavKey =
  | 'dashboard'
  | 'missions'
  | 'inventory'
  | 'orders'
  | 'movements'
  | 'customers'
  | 'alerts'
  | 'distribution';
export type NavIcon =
  'home' | 'flag' | 'boxes' | 'clipboard' | 'arrows' | 'users' | 'bell' | 'truck';

export interface NavItem {
  key: NavKey;
  icon: NavIcon;
  /** Locale-less path; absent for modules that are not built yet. */
  href?: string;
  roles: readonly Role[];
  /** Shown disabled with a "coming soon" label. */
  comingSoon?: boolean;
}

/** Roles allowed on the movements screen (GET /inventory/movements is ADMIN only). */
export const MOVEMENTS_ROLES: readonly Role[] = ['ADMIN'];
/** Customers are managed by an ADMIN only (contract 4.5). */
export const CUSTOMERS_ROLES: readonly Role[] = ['ADMIN'];
/** Creating orders is ADMIN only; both roles read and move them. */
export const ORDER_CREATE_ROLES: readonly Role[] = ['ADMIN'];

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', icon: 'home', href: '/app', roles: ROLES },
  { key: 'missions', icon: 'flag', href: '/app/missions', roles: ROLES },
  { key: 'orders', icon: 'clipboard', href: '/app/orders', roles: ROLES },
  { key: 'inventory', icon: 'boxes', href: '/app/products', roles: ROLES },
  { key: 'alerts', icon: 'bell', href: '/app/alerts', roles: ROLES },
  { key: 'customers', icon: 'users', href: '/app/customers', roles: CUSTOMERS_ROLES },
  { key: 'movements', icon: 'arrows', href: '/app/movements', roles: MOVEMENTS_ROLES },
  { key: 'distribution', icon: 'truck', roles: ROLES, comingSoon: true },
];

/**
 * Phone bottom bar per role (at most 5, within thumb reach). The operator works
 * from Missions in the warehouse, so it comes first and replaces the dashboard.
 */
export const MOBILE_NAV: Readonly<Record<Role, readonly NavKey[]>> = Object.freeze({
  OPERATOR: ['missions', 'orders', 'inventory', 'alerts'],
  ADMIN: ['dashboard', 'orders', 'inventory', 'alerts', 'customers'],
});

export function mobileNavFor(role: Role): NavItem[] {
  return MOBILE_NAV[role].flatMap((key) => NAV_ITEMS.find((item) => item.key === key) ?? []);
}

/** The entries a role sees, in order. Coming-soon entries are shown to everyone. */
export function navItemsFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** True when `pathname` (without the locale prefix) belongs to the item. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.href === '/app') return pathname === '/app';
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Whether a role may open a private path. UX only: the API enforces the same rule. */
export function canAccessPath(pathname: string, role: Role): boolean {
  const item = NAV_ITEMS.find((candidate) => candidate.href && isActive(candidate, pathname));
  return item ? item.roles.includes(role) : true;
}
