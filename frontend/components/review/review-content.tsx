"use client";

import { RecentContracts } from "@/components/contract/recent-contracts";
import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";
import { ReviewUploadWorkspace } from "@/components/review/upload/review-upload-workspace";
import { reviewableTypeLabels } from "@/config/contract-display";
import type { useReviewWorkflow } from "@/hooks/review/use-review-workflow";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";

type ReviewWorkflow = Pick<ReturnType<typeof useReviewWorkflow>,
  "file" | "title" | "setTitle" | "uploadedContract" | "cancelReview" | "cancelling" | "reviewResult" | "reviewProgress" | "reviewResultRef" | "timelineScrollRequest" |
  "pendingReviewId" | "retryKind" | "reviewError" | "reviewBlocked" | "stage" | "isReviewing" |
  "selectFile" | "reviewUploadedContract" | "retryReview" | "reviewing" | "loadingResult" | "reconnecting"
> & {
  reviewExisting: (contract: DashboardContract, rerun?: boolean) => void;
};

type ReviewContentProps = DashboardWorkspaceContext & {
  workflow: ReviewWorkflow;
  onViewAll: () => void;
  onDismissUpload?: () => void;
  onDeletedUpload?: () => void;
};

export function ReviewContent({ data, access, roleLabel, workflow, onViewAll, onDismissUpload, onDeletedUpload }: ReviewContentProps) {
  const { file, title, uploadedContract, cancelReview, cancelling, reviewResult, reviewProgress, reviewResultRef, timelineScrollRequest, pendingReviewId, retryKind, reviewError, reviewBlocked, stage, isReviewing, reviewing, loadingResult, reconnecting, selectFile, reviewUploadedContract, reviewExisting, retryReview } = workflow;
  const personal = data.role === "user";
  return <>
    {reviewError && !reviewBlocked && <div className={"flex flex-wrap items-center justify-between gap-[14px] [border:1px_solid_#f0d5c0] rounded-[12px] [background:#fff9f1] text-[#80572a] p-[16px] mb-[18px] text-[13px] leading-[1.6] [&_p]:m-[0] [&_button]:min-h-[40px] [&_button]:[border:1px_solid_#e8ca9f] [&_button]:rounded-[8px] [&_button]:[background:white] [&_button]:p-[8px_12px] [&_button]:text-[inherit] [&_button]:cursor-pointer"} role="alert"><p>{reviewError}</p><button type="button" onClick={retryReview} disabled={isReviewing}>{retryKind === "load" ? "Tải lại kết quả" : "Thử phân tích lại"}</button></div>}
      <ReviewUploadWorkspace role={data.role} orgId={(data.contractScopeId ?? data.organization.id)} reviewBlocked={reviewBlocked} access={access} roleLabel={roleLabel} formProps={{ file, title, supportedTypes: Object.values(reviewableTypeLabels(personal)), isUploading: stage === "uploading", onFileChange: selectFile }} stage={stage} timelineScrollRequest={timelineScrollRequest} reviewing={reviewing} loadingResult={loadingResult} reconnecting={reconnecting} reviewError={reviewError} retryKind={retryKind} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry={false} onRetry={retryReview} onCancel={cancelReview} cancelling={cancelling} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk={access.review} showAiContext={!personal && data.role !== "owner"} />
    {uploadedContract && onDismissUpload && <ContractConfirmationDialog orgId={(data.contractScopeId ?? data.organization.id)} role={data.role} key={uploadedContract.id} contractId={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={onDismissUpload} onDeleted={onDeletedUpload ?? onDismissUpload} onReview={reviewUploadedContract} />}
    <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={onViewAll} />
  </>;
}
