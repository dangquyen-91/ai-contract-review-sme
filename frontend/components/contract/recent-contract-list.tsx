import Link from "next/link";
import { ArrowRight, ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { contractTypeLabels, formatContractDate } from "@/config/contract-display";
import { routes } from "@/config/routes";
import { RiskBadge } from "./risk-badge";
import type { DashboardContract } from "@/types/contracts";

function StatusBadge({ contract }: { contract: DashboardContract }) {
  if (contract.status === "processing") return <Badge variant="info">AI đang rà soát</Badge>;
  if (contract.status === "unsupported") return <Badge variant="warning">Chưa hỗ trợ</Badge>;
  if (contract.status !== "reviewed") return <Badge variant="neutral">Chưa rà soát</Badge>;
  const risk = contract.currentVersion?.overallRiskLevel ?? contract.overallRiskLevel ?? "none";
  return <RiskBadge risk={risk} />;
}

function RecentRow({ contract }: { contract: DashboardContract }) {
  const id = contract.id ?? contract._id;
  if (!id) return null;
  const version = contract.currentVersion?.versionNumber ?? 1;
  return (
    <li>
      <Link
        href={routes.contract(id)}
        className="group grid grid-cols-[36px_minmax(0,1fr)_auto_16px] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none max-[580px]:grid-cols-[36px_minmax(0,1fr)_16px]"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary">
          <FileText aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-ui font-semibold text-foreground group-hover:text-primary">
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
    <Card role="region" aria-labelledby="recent-contracts-heading" className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border py-4">
        <CardTitle id="recent-contracts-heading" className="text-ui-card">Hợp đồng gần đây</CardTitle>
        <CardDescription className="text-ui-meta">Mở để xem kết quả, hỏi đáp hoặc tải phiên bản mới.</CardDescription>
        <CardAction className="self-center">
          <Link href={routes.contracts} className="inline-flex items-center gap-1.5 text-ui-meta font-semibold text-primary hover:underline">
            Xem tất cả
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      {contracts.length ? (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {contracts.map((contract) => <RecentRow key={contract.id ?? contract._id} contract={contract} />)}
        </ul>
      ) : (
        <p className="m-0 px-6 py-8 text-center text-ui text-muted-foreground">Hợp đồng bạn tải lên sẽ xuất hiện tại đây.</p>
      )}
    </Card>
  );
}
