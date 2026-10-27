import { ROLES, type Role } from '@/features/auth/types';

export type NavKey = 'dashboard' | 'inventory' | 'movements' | 'orders' | 'distribution' | 'alerts';
export type NavIcon = 'home' | 'boxes' | 'arrows' | 'clipboard' | 'truck' | 'bell';

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

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', icon: 'home', href: '/app', roles: ROLES },
  { key: 'inventory', icon: 'boxes', href: '/app/products', roles: ROLES },
  { key: 'movements', icon: 'arrows', href: '/app/movements', roles: MOVEMENTS_ROLES },
  { key: 'orders', icon: 'clipboard', roles: ROLES, comingSoon: true },
  { key: 'distribution', icon: 'truck', roles: ROLES, comingSoon: true },
  { key: 'alerts', icon: 'bell', roles: ROLES, comingSoon: true },
];

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
