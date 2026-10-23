"use client";

import type { OrganizationWorkflow } from "@/hooks/use-organization-workflow";
import { ReviewUploadWorkspace } from "@/components/review/upload/review-upload-workspace";
import { businessTypeLabels } from "@/config/contract-display";

export function OrganizationUpload({ workspace, showInlineRetry = false, showAiContext = true }: {
  workspace: OrganizationWorkflow;
  showInlineRetry?: boolean;
  showAiContext?: boolean;
}) {
  const { access, roleLabel, file, title, stage, selectFile, cancelReview, cancelling, reviewProgress, pendingReviewId, retryReview, reviewResult, reviewResultRef, timelineScrollRequest, reviewing, loadingResult, reconnecting, reviewError, reviewBlocked, retryKind } = workspace;
  return <ReviewUploadWorkspace role={workspace.data?.role} orgId={workspace.data?.organization.id} reviewBlocked={reviewBlocked} access={access} roleLabel={roleLabel} formProps={{ file, title, supportedTypes: Object.values(businessTypeLabels), isUploading: stage === "uploading", onFileChange: selectFile }} stage={stage} timelineScrollRequest={timelineScrollRequest} reviewing={reviewing} loadingResult={loadingResult} reconnecting={reconnecting} reviewError={reviewError} retryKind={retryKind} reviewProgress={reviewProgress} pendingReviewId={pendingReviewId} showInlineRetry={showInlineRetry} onRetry={retryReview} onCancel={cancelReview} cancelling={cancelling} reviewResult={reviewResult} resultRef={reviewResultRef} canAsk showAiContext={showAiContext}/>;
}

