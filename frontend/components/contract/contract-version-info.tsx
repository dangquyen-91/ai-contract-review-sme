import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatContractDate } from "@/config/contract-display";
import { routes } from "@/config/routes";
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

export function contractVersionCaption(contract: DashboardContract) {
  const versionNumber = contractVersionNumber(contract);
  const latestAt = contract.currentVersion?.createdAt;
  if (versionNumber < 2 || !latestAt) return null;
  return `Phiên bản ${versionNumber} tải ngày ${formatContractDate(latestAt)}`;
}

export function UploadVersionButton({ contract }: { contract: DashboardContract }) {
  const id = contract.id ?? contract._id;
  if (!id || !canAddContractVersion(contract)) return null;
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={routes.uploadVersion(id)}>
        <Upload aria-hidden="true" className="size-4" />
        Tải phiên bản mới
      </Link>
    </Button>
  );
}
