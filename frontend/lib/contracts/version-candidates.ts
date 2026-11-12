import type { VersionCandidate } from "@/components/review/upload/upload-target-picker";
import type { DashboardContract } from "@/types/contracts";

export function versionCandidates(contracts: DashboardContract[]): VersionCandidate[] {
  return contracts.flatMap((contract) => {
    const id = contract.id ?? contract._id;
    if (!id || contract.status === "unsupported" || contract.status === "archived") return [];
    return [{ id, title: contract.title, versionNumber: contract.currentVersion?.versionNumber }];
  });
}
