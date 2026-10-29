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
 * Per-tab polling: the fallback of useSharedAlerts when the browser has no
 * SharedWorker (TanStack Query dedupes the consumers of one tab).
 */
export function useAlerts({ enabled = true }: { enabled?: boolean } = {}) {
  const { authFetch } = useAuth();
  return useQuery({
    enabled,
    queryKey: alertKeys.all,
    queryFn: async () => (await authFetch<DataResponse<Alert[]>>('/alerts')).data,
    refetchInterval: ALERTS_REFETCH_MS,
    staleTime: 30_000,
  });
}
