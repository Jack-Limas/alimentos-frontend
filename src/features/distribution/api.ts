'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alertKeys } from '@/features/alerts/api';
import { requestSharedAlertsRefetch } from '@/features/alerts/browser-shared-alerts';
import { useAuth } from '@/features/auth/use-auth';
import { STOCK_WRITE_INVALIDATES } from '@/features/inventory/query-keys';
import { orderKeys } from '@/features/orders/api';
import type { DataResponse, Paginated } from '@/lib/api';
import type {
  ExplanationResponse,
  ProposalDetailDto,
  ProposalDto,
  ProposalInput,
  SnapshotDto,
} from './types';

export const PROPOSALS_PAGE_SIZE = 8;

export const distributionKeys = {
  all: ['distribution'] as const,
  snapshot: () => [...distributionKeys.all, 'snapshot'] as const,
  proposals: (page: number) => [...distributionKeys.all, 'proposals', page] as const,
  proposal: (id: string) => [...distributionKeys.all, 'proposal', id] as const,
};

/** PENDING orders, dispatchable lots and weights: the input of the local simulation. */
export function useSnapshot() {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: distributionKeys.snapshot(),
    queryFn: async () =>
      (await authFetch<DataResponse<SnapshotDto>>('/distribution/snapshot')).data,
    staleTime: 30_000,
  });
}

export function useProposals(page: number) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: distributionKeys.proposals(page),
    queryFn: () =>
      authFetch<Paginated<ProposalDto>>(
        `/distribution/proposals?page=${String(page)}&pageSize=${String(PROPOSALS_PAGE_SIZE)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useProposal(id: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: distributionKeys.proposal(id),
    queryFn: async () =>
      (await authFetch<DataResponse<ProposalDetailDto>>(`/distribution/proposals/${id}`)).data,
  });
}

/** The server recomputes the plan: the client sends only the strategy (and weights). */
export function useCreateProposal() {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProposalInput) =>
      (
        await authFetch<DataResponse<ProposalDetailDto>>('/distribution/proposals', {
          method: 'POST',
          json: input,
        })
      ).data,
    onSuccess: async (proposal) => {
      queryClient.setQueryData(distributionKeys.proposal(proposal.id), proposal);
      await queryClient.invalidateQueries({ queryKey: [...distributionKeys.all, 'proposals'] });
    },
  });
}

/** Confirming moves stock and orders: everything that shows them is refreshed. */
export function useProposalAction(action: 'confirm' | 'discard') {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: distributionKeys.all }),
      ...(action === 'confirm'
        ? [
            queryClient.invalidateQueries({ queryKey: orderKeys.all }),
            queryClient.invalidateQueries({ queryKey: alertKeys.all }),
            Promise.resolve(requestSharedAlertsRefetch()),
            ...STOCK_WRITE_INVALIDATES.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          ]
        : []),
    ]);
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await authFetch<DataResponse<ProposalDetailDto>>(
          `/distribution/proposals/${id}/${action}`,
          {
            method: 'POST',
          },
        )
      ).data,
    onSuccess: async (proposal) => {
      queryClient.setQueryData(distributionKeys.proposal(proposal.id), proposal);
      await refresh();
    },
    // A 409 means our copy is stale: reload it either way.
    onError: refresh,
  });
}

/** POST /ai/proposals/:id/explanation; the answer is stored in the proposal's aiInsight. */
export function useExplainProposal(id: string) {
  const { authFetch } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locale, refresh }: { locale: 'es' | 'en'; refresh?: boolean }) =>
      authFetch<ExplanationResponse>(
        `/ai/proposals/${id}/explanation${refresh ? '?refresh=true' : ''}`,
        { method: 'POST', json: { locale } },
      ),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<ProposalDetailDto>(distributionKeys.proposal(id), (current) =>
        current ? { ...current, aiInsight: data } : current,
      );
    },
  });
}
