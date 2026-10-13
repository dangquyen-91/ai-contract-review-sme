"use client";

import { RecentContracts } from "@/components/dashboard/contracts/contract-list";
import { AnalysisFocusDialog } from "@/components/contract/analysis-focus-dialog";
import { ReviewUploadWorkspace } from "@/components/review/review-upload-workspace";
import { businessTypeLabels } from "@/config/contract-display";
import type { useReviewWorkflow } from "@/hooks/use-review-workflow";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";

const personalTypeLabels: Record<string, string> = {
  life_insurance: "Hợp đồng bảo hiểm nhân thọ",
  housing_purchase: "Hợp đồng mua bán bất động sản",
  labor: "Hợp đồng lao động",
};

type ReviewWorkflow = Pick<ReturnType<typeof useReviewWorkflow>,
  "file" | "title" | "setTitle" | "contractType" | "setContractType" | "ourParty" | "setOurParty" |
  "industry" | "setIndustry" | "uploadedContract" | "reviewResult" | "reviewProgress" | "reviewResultRef" |
  "pendingReviewId" | "retryKind" | "reviewError" | "stage" | "isReviewing" | "selectedProfile" |
  "selectFile" | "reviewUploadedContract" | "retryReview" | "reviewing" | "loadingResult" | "reconnecting"
> & {
  reviewExisting: (contract: DashboardContract, rerun?: boolean) => void;
};

type ReviewContentProps = DashboardWorkspaceContext & {
  workflow: ReviewWorkflow;
  onViewAll: () => void;
  onDismissUpload?: () => void;
};

export function ReviewContent({ data, access, roleLabel, workflow, onViewAll, onDismissUpload }: ReviewContentProps) {
  const { file, title, setTitle, contractType, setContractType, ourParty, setOurParty, industry, setIndustry, uploadedContract, reviewResult, reviewProgress, reviewResultRef, pendingReviewId, retryKind, reviewError, stage, isReviewing, selectedProfile, reviewing, loadingResult, reconnecting, selectFile, reviewUploadedContract, reviewExisting, retryReview } = workflow;
  const personal = data.role === "user";
  const availableTypeLabels = personal ? personalTypeLabels : businessTypeLabels;
  return <>
    {reviewError && <div className={"flex flex-wrap items-center justify-between gap-[14px] [border:1px_solid_#f0d5c0] rounded-[12px] [background:#fff9f1] text-[#80572a] p-[16px] mb-[18px] text-[13px] leading-[1.6] [&_p]:m-[0] [&_button]:min-h-[40px] [&_button]:[border:1px_solid_#e8ca9f] [&_button]:rounded-[8px] [&_button]:[background:white] [&_button]:p-[8px_12px] [&_button]:text-[inherit] [&_button]:cursor-pointer"} role="alert"><p>{reviewError}</p><button type="button" onClick={retryReview} disabled={isReviewing}>{retryKind === "load" ? "Tải lại kết quả" : "Thử phân tích lại"}</button></div>}
      <ReviewUploadWorkspace access={access} roleLabel={roleLabel} formProps={{ file, title, contractType, typeLabels: availableTypeLabels, profile: selectedProfile, ourParty, fixedOurParty: data.role === "user" && contractType === "labor" ? "employee" : undefined, industry, isUploading: stage === "uploading", onFileChange: selectFile, onTitleChange: setTitle, onContractTypeChange: (value) => { setContractType(value); setOurParty(""); }, onOurPartyChange: setOurParty, onIndustryChange: setIndustry }} stage={stage} reviewing={reviewing} loadingResult={loadingResult} reconnecting={reconnecting} reviewError={reviewError} retryKind={retryKind} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry={false} onRetry={retryReview} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk={data.role !== "user"} showAiContext={!personal && data.role !== "owner"} />
    {uploadedContract && onDismissUpload && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={onDismissUpload} onReview={reviewUploadedContract} />}
    <RecentContracts contracts={data.contracts.slice(0, 5)} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing} onViewAll={onViewAll} />
  </>;
}
