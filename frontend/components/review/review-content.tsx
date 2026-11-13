"use client";

import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";
import { ReviewUploadPage } from "@/components/review/upload/review-upload-page";
import { reviewableTypeLabels } from "@/config/contract-display";
import { routes } from "@/config/routes";
import type { useReviewWorkflow } from "@/hooks/review/use-review-workflow";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { versionCandidates } from "@/lib/contracts/version-candidates";
import { useOpenContractReview } from "@/hooks/review/use-open-contract-review";

type ReviewWorkflow = Pick<ReturnType<typeof useReviewWorkflow>,
  "file" | "title" | "uploadedContract" | "selectedContractId" | "stage" | "reviewing" | "loadingResult" |
  "selectFile" | "duplicateUpload" | "dismissDuplicateUpload" | "uploadDuplicateAnyway"
>;

type ReviewContentProps = DashboardWorkspaceContext & {
  workflow: ReviewWorkflow;
  onDismissUpload?: () => void;
  onDeletedUpload?: () => void;
};

export function ReviewContent({ data, access, workflow, onDismissUpload, onDeletedUpload }: ReviewContentProps) {
  const { file, title, uploadedContract, selectedContractId, stage, reviewing, loadingResult, selectFile, duplicateUpload, dismissDuplicateUpload, uploadDuplicateAnyway } = workflow;
  const { startUploadedReview } = useOpenContractReview();
  const scopeId = data.contractScopeId ?? data.organization.id;
  const busy = reviewing || stage === "reviewing";
  return (
    <>
      <ReviewUploadPage
        data={data}
        access={access}
        uploading={stage === "uploading"}
        formProps={{
          file,
          title,
          supportedTypes: Object.values(reviewableTypeLabels(data.role === "user")),
          isUploading: stage === "uploading",
          isReviewing: busy,
          isLoadingResult: loadingResult,
          versionCandidates: versionCandidates(data.contracts),
          activeHref: (busy || loadingResult) && selectedContractId ? routes.contract(selectedContractId) : undefined,
          onFileChange: selectFile,
        }}
        duplicateUpload={duplicateUpload}
        onDismissDuplicate={dismissDuplicateUpload}
        onUploadDuplicate={uploadDuplicateAnyway}
      />
      {uploadedContract && onDismissUpload && (
        <ContractConfirmationDialog
          key={uploadedContract.id}
          orgId={scopeId}
          role={data.role}
          contractId={uploadedContract.id}
          contractTitle={uploadedContract.title}
          isReviewing={stage === "reviewing"}
          onDismiss={onDismissUpload}
          onDeleted={onDeletedUpload ?? onDismissUpload}
          onReview={startUploadedReview}
        />
      )}
    </>
  );
}
