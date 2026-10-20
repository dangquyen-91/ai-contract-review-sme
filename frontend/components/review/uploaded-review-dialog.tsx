"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { AnalysisFocusDialog } from "@/components/review/analysis-focus-dialog";

export function UploadedReviewDialog({ workspace }: { workspace: OrganizationWorkflow }) {
  const { uploadedContract, stage, skipUploadedReview, reviewUploadedContract } = workspace;
  return (uploadedContract && <AnalysisFocusDialog orgId={workspace.data?.organization.id} role={workspace.data?.role} key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={skipUploadedReview} onReview={reviewUploadedContract}/>);
}

