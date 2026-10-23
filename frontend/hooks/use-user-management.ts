"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClientError } from "@/lib/api/client";
import { userManagementApi } from "@/lib/api/user-management";
import { userManagementKeys } from "@/lib/query-keys/user-management";
import type { ManagedUser, SaveManagedUserInput, UserListParams } from "@/types/user-management";

export function useManagedUsers(params: UserListParams) {
  return useQuery({
    queryKey: userManagementKeys.list(params),
    queryFn: ({ signal }) => userManagementApi.list(params, signal),
    retry: false,
  });
}

export function useManagedUser(id: string) {
  return useQuery({
    queryKey: userManagementKeys.detail(id),
    queryFn: ({ signal }) => userManagementApi.detail(id, signal),
    retry: false,
  });
}

export function useSaveManagedUser() {
  const client = useQueryClient();
  return useMutation<ManagedUser, ApiClientError, SaveManagedUserInput>({
    mutationFn: (input) => input.id !== undefined
      ? userManagementApi.update(input.id, input.data)
      : userManagementApi.create(input.data),
    onSuccess: (user) => {
      client.setQueryData(userManagementKeys.detail(user.id), user);
      return client.invalidateQueries({ queryKey: userManagementKeys.lists });
    },
  });
}

export function useSetManagedUserStatus() {
  const client = useQueryClient();
  return useMutation<ManagedUser, ApiClientError, Pick<ManagedUser, "id" | "isActive">>({
    mutationFn: ({ id, isActive }) => userManagementApi.update(id, { isActive }),
    onSuccess: (user) => {
      client.setQueryData(userManagementKeys.detail(user.id), user);
      return client.invalidateQueries({ queryKey: userManagementKeys.lists });
    },
  });
}
