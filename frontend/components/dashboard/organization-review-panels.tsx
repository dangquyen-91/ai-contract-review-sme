"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ReviewUploadWorkspace } from "@/components/review/review-upload-workspace";
import { AnalysisFocusDialog } from "@/components/contract/analysis-focus-dialog";
import { businessTypeLabels } from "@/config/contract-display";
import { ContractTable } from "@/components/contract/contract-table";
import { MemberContractsView } from "./member/member-contracts-view";

export function OrganizationUpload({ workspace, showInlineRetry = false, showAiContext = true }: {
  workspace: OrganizationWorkflow;
  showInlineRetry?: boolean;
  showAiContext?: boolean;
}) {
  const { access, roleLabel, file, title, contractType, selectedProfile, ourParty, industry, stage, selectFile, setTitle, setContractType, setOurParty, setIndustry, reviewProgress, pendingReviewId, retryReview, reviewResult, reviewResultRef } = workspace;
  const availableTypeLabels = businessTypeLabels;
  return <ReviewUploadWorkspace access={access} roleLabel={roleLabel} formProps={{ file, title, contractType, typeLabels: availableTypeLabels, profile: selectedProfile, ourParty, industry, isUploading: stage === "uploading", onFileChange: selectFile, onTitleChange: setTitle, onContractTypeChange: (value) => { setContractType(value); setOurParty(""); }, onOurPartyChange: setOurParty, onIndustryChange: setIndustry }} stage={stage} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry={showInlineRetry} onRetry={retryReview} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk showAiContext={showAiContext}/>;
}

export function UploadedReviewDialog({ workspace }: { workspace: OrganizationWorkflow }) {
  const { uploadedContract, stage, skipUploadedReview, reviewUploadedContract } = workspace;
  return (uploadedContract && <AnalysisFocusDialog key={uploadedContract.id} contractTitle={uploadedContract.title} isReviewing={stage === "reviewing"} onDismiss={skipUploadedReview} onReview={reviewUploadedContract}/>);
}

export function MemberContractList({ workspace, reviewerMode = false, managerMode = false }: {
  workspace: OrganizationWorkflow;
  reviewerMode?: boolean;
  managerMode?: boolean;
}) {
  const { data, contractFilter, searchParams, selectTab, access, reviewExisting, isReviewing } = workspace;
  if (!data) return null;
  return <MemberContractsView key={JSON.stringify(contractFilter) + (searchParams.get("search") ?? "")} orgId={data.organization.id} filter={contractFilter} reviewerMode={reviewerMode} managerMode={managerMode} onFilter={(filter) => selectTab("contracts", filter)} renderContracts={(contracts) => <ContractTable highlightId={searchParams.get("uploaded") ?? undefined} contracts={contracts} canReview={access.review} onReview={reviewExisting} isReviewing={isReviewing}/>} />;
}
