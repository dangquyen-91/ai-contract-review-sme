import type { DashboardContract } from "@/types/contracts";

export function contractVersionNumber(contract: DashboardContract) {
  return contract.currentVersion?.versionNumber ?? 1;
}

export function canAddContractVersion(contract: DashboardContract) {
  return contract.status !== "unsupported" && contract.status !== "archived";
}

export function ContractVersionChip({ contract }: { contract: DashboardContract }) {
  const versionNumber = contractVersionNumber(contract);
  return (
    <span
      title={`Phiên bản hiện tại: ${versionNumber}`}
      className="inline-flex h-5 shrink-0 items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 text-ui-caption font-semibold tabular-nums text-blue-700"
    >
      v{versionNumber}
    </span>
  );
}
