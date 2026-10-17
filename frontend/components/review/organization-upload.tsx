"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ReviewUploadWorkspace } from "@/components/review/review-upload-workspace";
import { businessTypeLabels } from "@/config/contract-display";

export function OrganizationUpload({ workspace, showInlineRetry = false, showAiContext = true }: {
  workspace: OrganizationWorkflow;
  showInlineRetry?: boolean;
  showAiContext?: boolean;
}) {
  const { access, roleLabel, file, title, contractType, selectedProfile, ourParty, industry, stage, selectFile, setTitle, setContractType, setOurParty, setIndustry, reviewProgress, pendingReviewId, retryReview, reviewResult, reviewResultRef, timelineScrollRequest, reviewing, loadingResult, reconnecting, reviewError, reviewBlocked, retryKind } = workspace;
  const availableTypeLabels = businessTypeLabels;
  return <ReviewUploadWorkspace role={workspace.data?.role} orgId={workspace.data?.organization.id} reviewBlocked={reviewBlocked} access={access} roleLabel={roleLabel} formProps={{ file, title, contractType, typeLabels: availableTypeLabels, profile: selectedProfile, ourParty, industry, isUploading: stage === "uploading", onFileChange: selectFile, onTitleChange: setTitle, onContractTypeChange: (value) => { setContractType(value); setOurParty(""); }, onOurPartyChange: setOurParty, onIndustryChange: setIndustry }} stage={stage} timelineScrollRequest={timelineScrollRequest} reviewing={reviewing} loadingResult={loadingResult} reconnecting={reconnecting} reviewError={reviewError} retryKind={retryKind} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry={showInlineRetry} onRetry={retryReview} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk showAiContext={showAiContext}/>;
}

