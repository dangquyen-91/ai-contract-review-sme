"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { legalSourcesApi } from "@/lib/api/legal-sources";

import { legalSourceKeys } from "@/lib/query-keys/legal-sources";
import type { LegalSourceUpdate } from "@/types/legal-sources";


export function useLegalSources() {
  return useQuery({ queryKey: legalSourceKeys.list, queryFn: legalSourcesApi.list, retry: false,
    refetchInterval: (query) => query.state.data?.some((source) => source.ingestion && ["queued", "running", "paused"].includes(source.ingestion.status)) ? 5000 : false,
  });
}

export function useLegalSource(id: string) {
  return useQuery({ queryKey: legalSourceKeys.detail(id), queryFn: ({ signal }) => legalSourcesApi.detail(id, signal), retry: false,
    refetchInterval: (query) => query.state.data?.ingestion && ["queued", "running", "paused"].includes(query.state.data.ingestion.status) ? 5000 : false,
  });
}

export function useLegalSourceCatalog() {
  return useQuery({ queryKey: legalSourceKeys.catalog, queryFn: ({ signal }) => legalSourcesApi.catalog(signal), retry: false, staleTime: 60_000 });
}

export function usePreviewLegalSourceMutation() {
  return useMutation({ mutationFn: legalSourcesApi.preview });
}

export function useAppendLegalSourcePartMutation(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (data: FormData) => legalSourcesApi.appendPart(id, data),
    onSettled: () => client.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}

export function useUpdateLegalSourceMutation(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (data: LegalSourceUpdate) => legalSourcesApi.update(id, data),
    onSuccess: (source) => { client.setQueryData(legalSourceKeys.detail(id), source); },
    onSettled: () => client.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}

export function useResumeLegalSourceMutation(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => legalSourcesApi.resume(id),
    onSettled: () => client.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}

export function useAdminHealth() {
  return useQuery({ queryKey: legalSourceKeys.health, queryFn: legalSourcesApi.health, retry: false, staleTime: 30_000 });
}

export function useCreateLegalSourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: FormData) => legalSourcesApi.create(body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: legalSourceKeys.list }),
  });
}

export function useRemoveLegalSourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => legalSourcesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: legalSourceKeys.detail(id), exact: true });
      return queryClient.invalidateQueries({ queryKey: legalSourceKeys.list });
    },
  });
}
