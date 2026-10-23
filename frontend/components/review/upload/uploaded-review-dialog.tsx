"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";

export function UploadedReviewDialog({ workspace }: { workspace: OrganizationWorkflow }) {
  const { uploadedContract, stage, skipUploadedReview, clearUploadedContract, reviewUploadedContract } = workspace;
  return (uploadedContract && <ContractConfirmationDialog orgId={workspace.data?.organization.id} role={workspace.data?.role} key={uploadedContract.id} contractId={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={skipUploadedReview} onDeleted={clearUploadedContract} onReview={reviewUploadedContract}/>);
}

