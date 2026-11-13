import Link from "next/link";
import { ArrowRight, ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { contractRiskTones, contractTypeLabels, formatContractDate } from "@/config/contract-display";
import { routes } from "@/config/routes";
import type { ContractRiskLevel, DashboardContract } from "@/types/contracts";

const riskLabels: Record<ContractRiskLevel, string> = {
  high: "Rủi ro cao",
  medium: "Rủi ro trung bình",
  low: "Rủi ro thấp",
  none: "Không phát hiện rủi ro",
};

function StatusBadge({ contract }: { contract: DashboardContract }) {
  if (contract.status === "processing") return <Badge variant="info">AI đang rà soát</Badge>;
  if (contract.status === "unsupported") return <Badge variant="warning">Chưa hỗ trợ</Badge>;
  if (contract.status !== "reviewed") return <Badge variant="neutral">Chưa rà soát</Badge>;
  const risk = contract.currentVersion?.overallRiskLevel ?? contract.overallRiskLevel ?? "none";
  return <Badge variant={risk === "none" ? "success" : contractRiskTones[risk]}>{riskLabels[risk]}</Badge>;
}

function RecentRow({ contract }: { contract: DashboardContract }) {
  const id = contract.id ?? contract._id;
  if (!id) return null;
  const version = contract.currentVersion?.versionNumber ?? 1;
  return (
    <li>
      <Link
        href={routes.contract(id)}
        className="group grid grid-cols-[36px_minmax(0,1fr)_auto_16px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none max-[580px]:grid-cols-[36px_minmax(0,1fr)_16px]"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <FileText aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-ui font-semibold text-[#1f2d44] group-hover:text-primary">
            {contract.title}
            <span className="ml-2 align-[1px] text-ui-caption font-semibold text-blue-700">v{version}</span>
          </span>
          <span className="mt-0.5 block truncate text-ui-meta text-muted-foreground">
            {contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại"} · Cập nhật {formatContractDate(contract.updatedAt)}
          </span>
          <span className="mt-1.5 hidden max-[580px]:block"><StatusBadge contract={contract} /></span>
        </span>
        <span className="max-[580px]:hidden"><StatusBadge contract={contract} /></span>
        <ChevronRight aria-hidden="true" className="size-4 text-slate-400 group-hover:text-primary" />
      </Link>
    </li>
  );
}

export function RecentContractList({ contracts }: { contracts: DashboardContract[] }) {
  return (
    <section aria-labelledby="recent-contracts-heading" className="overflow-hidden rounded-[14px] border border-[#e4e8ef] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] px-5 py-4">
        <div>
          <h2 id="recent-contracts-heading" className="m-0 text-ui-card font-semibold">Hợp đồng gần đây</h2>
          <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">Mở để xem kết quả, hỏi đáp hoặc tải phiên bản mới.</p>
        </div>
        <Link href={routes.contracts} className="inline-flex items-center gap-1.5 text-ui-meta font-semibold text-primary hover:underline">
          Xem tất cả
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </header>
      {contracts.length ? (
        <ul className="m-0 list-none divide-y divide-[#edf0f4] p-0">
          {contracts.map((contract) => <RecentRow key={contract.id ?? contract._id} contract={contract} />)}
        </ul>
      ) : (
        <p className="m-0 px-5 py-8 text-center text-ui text-muted-foreground">Hợp đồng bạn tải lên sẽ xuất hiện tại đây.</p>
      )}
    </section>
  );
}
