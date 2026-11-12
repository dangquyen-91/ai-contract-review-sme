import { ReviewDashboardPage } from "@/components/review/review-page";
import { ContractVersionsPanel } from "@/components/contract/contract-versions-panel";
import { getWorkspaceResource, validateResourceId } from "@/lib/auth/workspace-data";
import type { ContractVersionSummary } from "@/types/contracts";

export default async function ContractDetailPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  validateResourceId(contractId);
  await getWorkspaceResource<ContractVersionSummary[]>("/contracts/" + contractId + "/versions");
  return (
    <ReviewDashboardPage>
      <ContractVersionsPanel contractId={contractId} />
    </ReviewDashboardPage>
  );
}
