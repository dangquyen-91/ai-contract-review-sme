"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import type { ContractTemplate } from "@/types/contract-drafts";
import { draftKeys } from "./use-contract-drafts";

export function useCreateContractDraft() {
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: contractDraftsApi.create });
  const lock = useRef(false);

  async function start(template: ContractTemplate, party: string) {
    if (lock.current) return;
    lock.current = true;
    try {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      const draft = await mutation.mutateAsync({
        templateCode: template.code,
        ...(template.id ? { templateId: template.id } : {}),
        title: `${template.name} - ${new Date().toLocaleDateString("vi-VN")}`,
        ourParty: party,
        editorMode: "studio",
        input: Object.fromEntries(
          template.fields
            .filter((field) =>
              ["signingDate", "startDate", "termType"].includes(field.key),
            )
            .map((field) => [
              field.key,
              field.key === "termType" ? "fixed" : today,
            ]),
        ),
      });
      client.setQueryData(draftKeys.detail(draft.id), draft);
      await client.invalidateQueries({ queryKey: draftKeys.lists });
      router.push(`/contract-drafts/${draft.id}`);
    } catch {
      lock.current = false;
    }
  }

  return { start, isPending: mutation.isPending, error: mutation.error };
}
