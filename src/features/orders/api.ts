'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertKeys } from '@/features/alerts/api';
import { useAuth } from '@/features/auth/use-auth';
import type { DataResponse, Paginated } from '@/lib/api';
import type { Order, OrderDetail, OrderInput, OrderStatus } from './types';

export const orderKeys = {
  all: ['orders'] as const,
  list: (query: string) => [...orderKeys.all, 'list', query] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

/** `query` is the GET /orders query string (see toOrdersApiQuery). */
export function useOrders(query: string, options: { refetchInterval?: number } = {}) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => authFetch<Paginated<Order>>(`/orders?${query}`),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useOrder(id: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: async () => (await authFetch<DataResponse<OrderDetail>>(`/orders/${id}`)).data,
  });
}

/** An order write changes order lists and details, and the due-soon and shortage alerts. */
function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      queryClient.invalidateQueries({ queryKey: alertKeys.all }),
    ]);
}

export function useCreateOrder() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (input: OrderInput) =>
      (await authFetch<DataResponse<OrderDetail>>('/orders', { method: 'POST', json: input })).data,
    onSuccess: invalidate,
  });
}

export interface StatusChangeInput {
  id: string;
  status: OrderStatus;
  note?: string;
}

export function useChangeOrderStatus() {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async ({ id, status, note }: StatusChangeInput) =>
      (
        await authFetch<DataResponse<OrderDetail>>(`/orders/${id}/status`, {
          method: 'PATCH',
          json: { status, ...(note ? { note } : {}) },
        })
      ).data,
    onSuccess: async (order) => {
      // Show the new status at once, then refresh lists and alerts.
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      await invalidate();
    },
    // A 409 STATUS_CHANGED means our copy is stale: reload it either way.
    onError: invalidate,
  });
}
