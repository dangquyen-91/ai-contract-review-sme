"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { contractKeys } from "@/lib/query-keys/contracts";
import { dashboardKeys } from "@/lib/query-keys/dashboard";
import type { ExpertVerificationResult } from "@/types/expert-verification";

export function useVerificationResultSync(contractId: string, result?: ExpertVerificationResult, refreshedAt?: number) {
  const client = useQueryClient();
  useEffect(() => {
    const verification = result?.verification;
    if (!contractId || !verification) return;
    const actions = result?.actions ?? [];
    if (!actions.length && verification.status !== "approved" && verification.status !== "returned") return;
    const fingerprint = `${verification.attempt}:${verification.status}:${actions.length}:${actions.at(-1)?._id ?? ""}`;
    const syncKey = ["expert-verification", verification.reviewId, "result-sync", contractId];
    // Keep the marker in the session's QueryClient: a refreshed version can
    // remount the header, and must not start another refresh loop.
    if (client.getQueryData(syncKey) === fingerprint) return;
    client.setQueryData(syncKey, fingerprint);
    void Promise.all([
      client.invalidateQueries({ queryKey: contractKeys.result(contractId) }, { throwOnError: true }),
      client.invalidateQueries({ queryKey: contractKeys.findings(contractId) }),
      client.invalidateQueries({ queryKey: contractKeys.detail(contractId) }),
      client.invalidateQueries({ queryKey: ["contracts", contractId, "share-summary"] }),
      client.invalidateQueries({ queryKey: contractKeys.chat(contractId) }),
      client.invalidateQueries({ queryKey: contractKeys.lists }),
      client.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]).catch(() => {
      if (client.getQueryData(syncKey) === fingerprint) client.removeQueries({ queryKey: syncKey, exact: true });
    });
  }, [client, contractId, result, refreshedAt]);
}
