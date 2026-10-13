"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { useReviewWorkflow, reviewErrorMessage } from "@/hooks/use-review-workflow";
import { useLoadContract } from "@/hooks/use-contracts";
import { isReviewCancelled } from "@/lib/review-session";

export function usePersonalReviewWorkspace({ data, access }: DashboardWorkspaceContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflow = useReviewWorkflow({ access, initialType: data.role === "user" ? "life_insurance" : "service", personal: data.role === "user", reviewPath: `/dashboard/${data.role === "administrator" ? "admin" : data.role}/review` });
  const { reviewExisting, setUploadedContract } = workflow;
  const openedReviewRequest = useRef<string | null>(null);
  const loadContract = useLoadContract();
  const openReview = useEffectEvent(reviewExisting);

  useEffect(() => {
    const contractId = searchParams.get("contract");
    if (!contractId) {
      openedReviewRequest.current = null;
      return;
    }
    if (openedReviewRequest.current === contractId) return;
    openedReviewRequest.current = contractId;
    if (workflow.activeReviewRequest.current === contractId) return;
    let cancelled = false;
    let initiated = false;
    void (async () => {
      try {
        await Promise.resolve();
        if (cancelled) return;
        const contract = data.contracts.find((item) => (item.id ?? item._id) === contractId)
          ?? await loadContract(contractId);
        if (!cancelled) {
          initiated = true;
          await openReview(contract, searchParams.get("rerun") === "1", searchParams.get("reviewMode") === "resume");
        }
      } catch (requestError) {
        if (cancelled || isReviewCancelled(requestError)) return;
        toast.error("Chưa thể mở hợp đồng", { description: reviewErrorMessage(requestError) });
      }
    })();
    return () => {
      cancelled = true;
      if (!initiated && openedReviewRequest.current === contractId) openedReviewRequest.current = null;
    };
  }, [data, searchParams, workflow.activeReviewRequest, loadContract]);

  return {
    workflow,
    onViewAll: () => router.push(`/dashboard/${data.role === "administrator" ? "admin" : data.role}/contract`),
    onDismissUpload: () => {
      setUploadedContract(null);
      toast.success("Đã tải hợp đồng lên");
    },
  };
}
