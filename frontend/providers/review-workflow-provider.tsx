"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace";
import { useReviewWorkflow } from "@/hooks/use-review-workflow";
import { useReviewResultNavigation } from "@/hooks/use-review-result-navigation";
import { useReviewTimelineScroll } from "@/hooks/use-review-timeline-scroll";

type ReviewWorkflow = ReturnType<typeof useReviewWorkflow>;
const ReviewWorkflowContext = createContext<ReviewWorkflow | null>(null);

// The dashboard layout owns the job. Route changes only mount/unmount its views.
export function ReviewWorkflowProvider({ children }: { children: ReactNode; initialRole?: string }) {
  const { access } = useDashboardWorkspace();
  const router = useRouter();
  const workflow = useReviewWorkflow({ access });
  useReviewTimelineScroll(workflow.timelineScrollRequest, workflow.reviewTimelineRef);
  const contract = workflow.reviewResult?.contract;
  const contractId = contract?.id ?? contract?._id;
  const openResult = useCallback(() => {
    if (contractId) router.push(`/contract/${encodeURIComponent(contractId)}#review-result`);
  }, [contractId, router]);
  useReviewResultNavigation({
    resultKey: contractId ? `${contractId}:${contract?.updatedAt}` : undefined,
    title: contract?.title,
    timelineRef: workflow.reviewTimelineRef,
    resultRef: workflow.reviewResultRef,
    onOpenResult: openResult,
  });
  return <ReviewWorkflowContext.Provider value={workflow}>{children}</ReviewWorkflowContext.Provider>;
}

export function useDashboardReviewWorkflow() {
  const workflow = useContext(ReviewWorkflowContext);
  if (!workflow) throw new Error("useDashboardReviewWorkflow requires ReviewWorkflowProvider");
  return workflow;
}
