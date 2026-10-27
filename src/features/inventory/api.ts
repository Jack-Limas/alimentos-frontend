'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import type { DataResponse, Paginated } from '@/lib/api';
import { inventoryKeys, STOCK_WRITE_INVALIDATES } from './query-keys';
import type { EntryInput, ExitInput, ExitResult, InventorySummary, Lot, Movement } from './types';

export function useInventorySummary() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: async () =>
      (await authFetch<DataResponse<InventorySummary>>('/inventory/summary')).data,
  });
}

/** `query` is the GET /inventory/movements query string (see movement-filters). */
export function useMovements(query: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: inventoryKeys.movements(query),
    queryFn: () => authFetch<Paginated<Movement>>(`/inventory/movements?${query}`),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      STOCK_WRITE_INVALIDATES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useCreateEntry() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (input: EntryInput) =>
      (
        await authFetch<DataResponse<{ lot: Lot; movement: Movement }>>('/inventory/entries', {
          method: 'POST',
          json: input,
        })
      ).data,
    onSuccess: invalidate,
  });
}

export function useCreateExit() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: async (input: ExitInput) =>
      (
        await authFetch<DataResponse<ExitResult>>('/inventory/exits', {
          method: 'POST',
          json: input,
        })
      ).data,
    onSuccess: invalidate,
  });
}
