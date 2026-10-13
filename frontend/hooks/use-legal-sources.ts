"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legalSourcesApi } from "@/lib/api/legal-sources";

export const legalSourceKeys = {
  list: ["admin", "legal-sources"] as const,
  health: ["admin", "health"] as const,
};

export function useLegalSources() {
  return useQuery({ queryKey: legalSourceKeys.list, queryFn: legalSourcesApi.list, retry: false });
}

export function useAdminHealth() {
  return useQuery({ queryKey: legalSourceKeys.health, queryFn: legalSourcesApi.health, retry: false, staleTime: 30_000 });
}

export function useCreateLegalSourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FormData) => legalSourcesApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}

export function useRemoveLegalSourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => legalSourcesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}
