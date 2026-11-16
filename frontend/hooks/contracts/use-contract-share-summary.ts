"use client";

import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import { contractKeys } from "@/lib/query-keys/contracts";

export function useContractShareSummary(contractId: string, version?: string) {
  return useQuery({
    queryKey: contractKeys.shareSummary(contractId, version),
    queryFn: async ({ signal }) => {
      const result = await contractsApi.getShareSummary(contractId, version, signal);
      if (result.redacted !== true || typeof result.text !== "string" || !result.text.trim()) {
        throw new Error("Máy chủ chưa trả bản tóm tắt đã che hợp lệ.");
      }
      return result;
    },
    enabled: Boolean(contractId), retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
}
