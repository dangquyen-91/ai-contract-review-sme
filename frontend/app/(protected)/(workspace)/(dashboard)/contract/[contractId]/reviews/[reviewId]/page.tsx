import { notFound } from "next/navigation";
import { getWorkspaceResource, validateResourceId } from "@/lib/auth/workspace-data";
import { WorkspaceContent } from "@/components/layouts/dashboard/workspace-content";
import { ReviewVersionResult } from "@/components/contract/review-version-result";
import type { ContractReviewRun, ContractVersionSummary, RiskFinding } from "@/types/contracts";

export default async function ReviewDetailPage({ params }: { params: Promise<{ contractId: string; reviewId: string }> }) {
  const { contractId, reviewId } = await params;
  validateResourceId(contractId);
  validateResourceId(reviewId);
  const [run, versions] = await Promise.all([
    getWorkspaceResource<ContractReviewRun>("/reviews/" + reviewId),
    getWorkspaceResource<ContractVersionSummary[]>("/contracts/" + contractId + "/versions"),
  ]);
  if (run.contractId !== contractId) notFound();
  const version = versions.find((item) => item.id === run.versionId);
  const findingsStored = run.status === "completed" && Boolean(run.versionId) && version?.latestReview?.id === run._id;
  const findings = findingsStored
    ? await getWorkspaceResource<RiskFinding[]>("/contracts/" + contractId + "/risks?versionId=" + run.versionId)
    : [];
  return (
    <WorkspaceContent>
      <ReviewVersionResult
        contractId={contractId}
        run={run}
        version={version}
        current={versions.find((item) => item.isCurrent)}
        findings={findings}
        findingsStored={findingsStored}
      />
    </WorkspaceContent>
  );
}
