"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { useReviewWorkflow, reviewErrorMessage } from "@/hooks/use-review-workflow";
import { contractsApi } from "@/lib/api/contracts";

export function usePersonalReviewWorkspace({ data, access }: DashboardWorkspaceContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflow = useReviewWorkflow({ access, initialType: data.role === "user" ? "life_insurance" : "service", personal: data.role === "user" });
  const { reviewExisting, setUploadedContract } = workflow;
  const openedReviewRequest = useRef<string | null>(null);

  useEffect(() => {
    const contractId = searchParams.get("contract");
    if (!contractId) {
      openedReviewRequest.current = null;
      return;
    }
    if (openedReviewRequest.current === contractId) return;
    openedReviewRequest.current = contractId;
    void (async () => {
      try {
        const contract = data.contracts.find((item) => (item.id ?? item._id) === contractId)
          ?? await contractsApi.getContract(contractId);
        await reviewExisting(contract, searchParams.get("rerun") === "1");
      } catch (requestError) {
        toast.error("Chưa thể mở hợp đồng", { description: reviewErrorMessage(requestError) });
      }
    })();
  }, [data, searchParams, reviewExisting]);

  return {
    workflow,
    onViewAll: () => router.push(`/dashboard/${data.role === "administrator" ? "admin" : data.role}/contract`),
    onDismissUpload: () => {
      setUploadedContract(null);
      toast.success("Đã tải hợp đồng lên");
    },
  };
}
