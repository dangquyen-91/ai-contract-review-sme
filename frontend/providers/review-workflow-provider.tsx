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
export function ReviewWorkflowProvider({ children, initialRole }: { children: ReactNode; initialRole: string }) {
  const { data, access } = useDashboardWorkspace();
  const role = data?.role ?? initialRole;
  const reviewPath = `/dashboard/${role === "administrator" ? "admin" : role}/review`;
  const router = useRouter();
  const workflow = useReviewWorkflow({ access, initialType: role === "user" ? "life_insurance" : "service", personal: role === "user", reviewPath, workspaceReady: Boolean(data?.organization.id) });
  useReviewTimelineScroll(workflow.timelineScrollRequest, workflow.reviewTimelineRef);
  const contract = workflow.reviewResult?.contract;
  const contractId = contract?.id ?? contract?._id;
  const openResult = useCallback(() => {
    if (contractId) router.push(`${reviewPath}?${new URLSearchParams({ contract: contractId, reviewMode: "resume" })}#review-result`);
  }, [contractId, reviewPath, router]);
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
