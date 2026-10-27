import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  isActive,
  MOVEMENTS_ROLES,
  NAV_ITEMS,
  navItemsFor,
} from '@/features/app-shell/navigation';
import {
  parseMovementFilters,
  serializeMovementFilters,
  toMovementsApiQuery,
} from '@/features/inventory/movement-filters';
import { hasRole } from '@/features/auth/types';
import en from '../messages/en.json';
import es from '../messages/es.json';

const operator = { id: 'o', email: 'o@example.com', name: 'Op', role: 'OPERATOR' as const };
const admin = { ...operator, role: 'ADMIN' as const };

describe('navigation by role', () => {
  it('shows Movements to an ADMIN only', () => {
    expect(navItemsFor('ADMIN').map((i) => i.key)).toContain('movements');
    expect(navItemsFor('OPERATOR').map((i) => i.key)).not.toContain('movements');
  });

  it('gives both roles the dashboard, inventory and the coming-soon modules', () => {
    for (const role of ['ADMIN', 'OPERATOR'] as const) {
      expect(navItemsFor(role).map((i) => i.key)).toEqual(
        expect.arrayContaining(['dashboard', 'inventory', 'orders', 'distribution', 'alerts']),
      );
    }
  });

  it('marks unbuilt modules as coming soon, without a link', () => {
    for (const item of NAV_ITEMS.filter((i) => i.comingSoon)) expect(item.href).toBeUndefined();
  });

  it('guards the movements screen for an OPERATOR, including deeper paths', () => {
    expect(canAccessPath('/app/movements', 'OPERATOR')).toBe(false);
    expect(canAccessPath('/app/movements/anything', 'OPERATOR')).toBe(false);
    expect(canAccessPath('/app/movements', 'ADMIN')).toBe(true);
    expect(canAccessPath('/app/products/123', 'OPERATOR')).toBe(true);
    expect(hasRole(operator, MOVEMENTS_ROLES)).toBe(false);
    expect(hasRole(admin, MOVEMENTS_ROLES)).toBe(true);
  });

  it('highlights the dashboard only on /app and inventory on product pages', () => {
    const [dashboard, inventory] = NAV_ITEMS;
    if (!dashboard || !inventory) throw new Error('missing items');
    expect(isActive(dashboard, '/app')).toBe(true);
    expect(isActive(dashboard, '/app/products')).toBe(false);
    expect(isActive(inventory, '/app/products/abc')).toBe(true);
    expect(isActive(inventory, '/app/productsx')).toBe(false);
  });

  it.each(Object.entries({ es, en }))('%s labels every navigation entry', (_l, messages) => {
    for (const item of NAV_ITEMS) expect(messages.AppShell.nav[item.key]).toBeTruthy();
  });
});

describe('movement filters', () => {
  it('round-trips the URL and drops invalid values', () => {
    const query = 'type=EXIT_WASTE&from=2026-10-01&to=2026-10-26&page=2';
    expect(parseMovementFilters(new URLSearchParams(query))).toEqual({
      type: 'EXIT_WASTE',
      from: '2026-10-01',
      to: '2026-10-26',
      page: 2,
    });
    expect(serializeMovementFilters(parseMovementFilters(new URLSearchParams(query)))).toBe(query);
    expect(parseMovementFilters(new URLSearchParams('type=STOLEN&from=ayer'))).toEqual({ page: 1 });
  });

  it('drops an end date before the start date', () => {
    expect(parseMovementFilters(new URLSearchParams('from=2026-10-20&to=2026-10-01'))).toEqual({
      from: '2026-10-20',
      page: 1,
    });
  });

  it('sends whole Bogota days to the API as instants', () => {
    expect(
      new URLSearchParams(toMovementsApiQuery({ from: '2026-10-26', to: '2026-10-26', page: 1 })),
    ).toEqual(
      new URLSearchParams(
        'from=2026-10-26T05:00:00.000Z&to=2026-10-27T04:59:59.999Z&page=1&pageSize=20',
      ),
    );
  });
});
