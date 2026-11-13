"use client";

import type { OrganizationWorkflow } from "@/hooks/organizations/use-organization-workflow";
import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";
import { useOpenContractReview } from "@/hooks/review/use-open-contract-review";

export function UploadedReviewDialog({ workspace }: { workspace: OrganizationWorkflow }) {
  const { uploadedContract, stage, skipUploadedReview, clearUploadedContract } = workspace;
  const { startUploadedReview } = useOpenContractReview();
  return (uploadedContract && <ContractConfirmationDialog orgId={workspace.data?.organization.id} role={workspace.data?.role} key={uploadedContract.id} contractId={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={skipUploadedReview} onDeleted={clearUploadedContract} onReview={startUploadedReview}/>);
}

