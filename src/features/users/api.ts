'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AUTH_PATHS } from '@/features/auth/api';
import type { AuthUser } from '@/features/auth/types';
import { useAuth } from '@/features/auth/use-auth';
import type { DataResponse, Paginated } from '@/lib/api';
import type { ManagedUser, NewUserInput, UserPatch } from './types';

export const userKeys = {
  all: ['users'] as const,
  list: (query: string) => [...userKeys.all, 'list', query] as const,
};

export function useUsers(query: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: userKeys.list(query),
    queryFn: () => authFetch<Paginated<ManagedUser>>(`/users?${query}`),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}

export function useCreateUser() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: NewUserInput) =>
      (await authFetch<DataResponse<ManagedUser>>('/users', { method: 'POST', json: input })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UserPatch }) =>
      (
        await authFetch<DataResponse<ManagedUser>>(`/users/${id}`, {
          method: 'PATCH',
          json: patch,
        })
      ).data,
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async ({ id, temporaryPassword }: { id: string; temporaryPassword: string }) =>
      (
        await authFetch<DataResponse<ManagedUser>>(`/users/${id}/reset-password`, {
          method: 'POST',
          json: { temporaryPassword },
        })
      ).data,
    onSuccess: invalidate,
  });
}

/**
 * The signed-in user's own password. The refresh cookie (sent by apiFetch)
 * tells the server which session to keep; every other one is closed. The
 * returned user (mustChangePassword false) replaces the one in the session.
 */
export function useChangePassword() {
  const { authFetch, updateUser } = useAuth();
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) =>
      (
        await authFetch<DataResponse<AuthUser>>(AUTH_PATHS.changePassword, {
          method: 'POST',
          json: input,
        })
      ).data,
    onSuccess: (user) => {
      updateUser(user);
    },
  });
}
