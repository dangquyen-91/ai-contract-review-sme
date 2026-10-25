"use client";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { contractDraftsApi } from '@/lib/api/contract-drafts';
import type { ContractDraft } from '@/types/contract-drafts';

export const draftKeys = { all: ['contract-drafts'] as const, catalog: ['contract-drafts', 'templates'] as const, list: (page: number) => ['contract-drafts', 'list', page] as const, detail: (id: string) => ['contract-drafts', 'detail', id] as const };
export const useDraftCatalog = () => useQuery({ queryKey: draftKeys.catalog, queryFn: contractDraftsApi.catalog });
export const useDraftList = (page: number) => useQuery({ queryKey: draftKeys.list(page), queryFn: () => contractDraftsApi.list(page), refetchInterval: 60_000 });
export const useContractDraft = (id: string) => useQuery({ queryKey: draftKeys.detail(id), queryFn: () => contractDraftsApi.get(id), refetchOnWindowFocus: false, staleTime: Infinity });
export function useSaveDraftCache() {
  const client = useQueryClient();
  return useCallback((draft: ContractDraft) => {
    client.setQueryData(draftKeys.detail(draft.id), draft);
    void client.invalidateQueries({ queryKey: ['contract-drafts', 'list'] });
  }, [client]);
}
