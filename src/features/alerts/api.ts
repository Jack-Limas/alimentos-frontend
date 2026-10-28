'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import type { DataResponse } from '@/lib/api';
import type { Alert } from './types';

/** Alerts are computed on the fly by the server; poll them every minute. */
export const ALERTS_REFETCH_MS = 60_000;

export const alertKeys = {
  all: ['alerts'] as const,
};

/**
 * One query shared by the alerts page, the dashboard and the navigation badge
 * (TanStack Query dedupes them). Phase 5 moves the polling to a SharedWorker.
 */
export function useAlerts() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: alertKeys.all,
    queryFn: async () => (await authFetch<DataResponse<Alert[]>>('/alerts')).data,
    refetchInterval: ALERTS_REFETCH_MS,
    staleTime: 30_000,
  });
}
