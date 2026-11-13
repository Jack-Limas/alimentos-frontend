import type { Role } from '@/features/auth/types';
import type { ActiveFilter } from './types';

export const USERS_PAGE_SIZE = 20;

/** Builds the GET /users query from the filters (only what is set). */
export function usersQuery(filters: {
  search: string;
  role: Role | '';
  status: ActiveFilter;
  page: number;
}): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(USERS_PAGE_SIZE),
  });
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.status !== 'all') params.set('active', String(filters.status === 'active'));
  return params.toString();
}
