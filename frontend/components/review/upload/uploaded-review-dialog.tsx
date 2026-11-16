"use client";

import { usePathname, useRouter } from "next/navigation";
import type { OrganizationWorkflow } from "@/hooks/organizations/use-organization-workflow";
import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";
import { useOpenContractReview } from "@/hooks/review/use-open-contract-review";
import { routes } from "@/config/routes";

export function UploadedReviewDialog({ workspace }: { workspace: OrganizationWorkflow }) {
  const pathname = usePathname();
  const router = useRouter();
  const { uploadedContract, stage, skipUploadedReview, clearUploadedContract } = workspace;
  const { startUploadedReview, finishAttach } = useOpenContractReview();
  if (!uploadedContract) return null;
  const onContractPage = pathname === routes.contract(uploadedContract.id);
  return (
    <ContractConfirmationDialog
      key={uploadedContract.id}
      orgId={workspace.data?.organization.id}
      role={workspace.data?.role}
      contractId={uploadedContract.id}
      contractTitle={uploadedContract.title}
      isReviewing={stage === "reviewing"}
      onDismiss={onContractPage ? clearUploadedContract : skipUploadedReview}
      onDeleted={() => {
        clearUploadedContract();
        if (onContractPage) router.replace(routes.contracts);
      }}
      onReview={startUploadedReview}
      onAttached={finishAttach}
    />
  );
}
