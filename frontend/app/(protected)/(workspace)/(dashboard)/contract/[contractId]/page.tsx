import { ContractDetailPage } from "@/components/contract/detail/contract-detail-page";
import { getWorkspaceResource, validateResourceId } from "@/lib/auth/workspace-data";
import type { ContractVersionSummary } from "@/types/contracts";

export default async function ContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  validateResourceId(contractId);
  await getWorkspaceResource<ContractVersionSummary[]>("/contracts/" + contractId + "/versions");
  return <ContractDetailPage contractId={contractId} />;
}
