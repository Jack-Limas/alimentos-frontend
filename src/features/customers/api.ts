'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import type { DataResponse, Paginated } from '@/lib/api';
import type { Customer, CustomerInput, CustomerPatch } from './types';

export const customerKeys = {
  all: ['customers'] as const,
  list: (query: string) => [...customerKeys.all, 'list', query] as const,
};

export function useCustomers(query: string, enabled = true) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: customerKeys.list(query),
    queryFn: () => authFetch<Paginated<Customer>>(`/customers?${query}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  // Order cards show the customer name, so they are refreshed too.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: customerKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
}

export function useCreateCustomer() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async (input: CustomerInput) =>
      (await authFetch<DataResponse<Customer>>('/customers', { method: 'POST', json: input })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CustomerPatch }) =>
      (
        await authFetch<DataResponse<Customer>>(`/customers/${id}`, {
          method: 'PATCH',
          json: patch,
        })
      ).data,
    onSuccess: invalidate,
  });
}
