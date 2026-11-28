"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import { draftKeys } from "./use-contract-drafts";

/** Uploads a contract file as a new studio draft and opens it in the editor. */
export function useImportContractDraft() {
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: contractDraftsApi.importFile,
    onSuccess: async (draft) => {
      client.setQueryData(draftKeys.detail(draft.id), draft);
      await client.invalidateQueries({ queryKey: draftKeys.lists });
      router.push(`/contract-drafts/${draft.id}`);
    },
  });
}
