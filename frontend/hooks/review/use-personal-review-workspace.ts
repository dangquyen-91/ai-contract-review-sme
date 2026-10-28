"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { reviewErrorMessage } from "@/hooks/review/use-review-workflow";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import { useLoadContract } from "@/hooks/contracts/use-contracts";
import { isReviewCancelled } from "@/lib/review-session";

export function usePersonalReviewWorkspace({ data }: DashboardWorkspaceContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { contractId: routeContractId } = useParams<{ contractId?: string }>();
  const workflow = useDashboardReviewWorkflow();
  const { reviewExisting, setUploadedContract } = workflow;
  const openedReviewRequest = useRef<string | null>(null);
  const loadContract = useLoadContract();
  const openReview = useEffectEvent(reviewExisting);

  useEffect(() => {
    const contractId = routeContractId ?? searchParams.get("contract");
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
  }, [data, routeContractId, searchParams, workflow.activeReviewRequest, loadContract]);

  return {
    workflow,
    onViewAll: () => router.push("/contract"),
    onDismissUpload: () => {
      setUploadedContract(null);
      toast.success("Đã tải hợp đồng lên");
    },
    onDeletedUpload: () => setUploadedContract(null),
  };
}
