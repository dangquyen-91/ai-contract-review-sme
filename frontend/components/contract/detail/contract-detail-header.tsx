"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MoreHorizontal, RotateCw, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contractTypeLabels, formatContractDate } from "@/config/contract-display";
import { routes } from "@/config/routes";
import { useBackToContractList } from "@/hooks/contracts/use-back-to-contract-list";
import { ContractDeleteDialog } from "@/components/contract/contract-delete-dialog";
import { canAddContractVersion } from "@/components/contract/contract-version-info";
import { ContractVersionSwitcher } from "./contract-version-switcher";
import { RiskBadge } from "@/components/contract/risk-badge";
import type { ContractVersionSummary, DashboardContract } from "@/types/contracts";
import type { DashboardData } from "@/types/dashboard";

type Review = NonNullable<ContractVersionSummary["latestReview"]>;

const expertLabels: Record<NonNullable<Review["verificationStatus"]>, { label: string; tone: "info" | "success" | "warning" }> = {
  requested: { label: "Chờ chuyên gia tiếp nhận", tone: "info" },
  in_progress: { label: "Chuyên gia đang kiểm tra", tone: "info" },
  approved: { label: "Chuyên gia đã xác nhận", tone: "success" },
  returned: { label: "Chuyên gia đã trả lại", tone: "warning" },
};

function AiStatus({ contract, review }: { contract?: DashboardContract; review?: Review | null }) {
  if (contract?.status === "processing") return <Badge variant="info">AI đang rà soát</Badge>;
  if (review?.status === "completed" && review.overallRiskLevel) {
    return <RiskBadge risk={review.overallRiskLevel} />;
  }
  if (contract?.status === "unsupported") return <Badge variant="warning">Chưa hỗ trợ rà soát</Badge>;
  return <Badge variant="neutral">Chưa rà soát</Badge>;
}

function ExpertStatus({ review }: { review?: Review | null }) {
  const status = review?.verificationStatus;
  if (!status) return <Badge variant="neutral">Chưa gửi chuyên gia</Badge>;
  return <Badge variant={expertLabels[status].tone}>{expertLabels[status].label}</Badge>;
}

function ContractMenu({ contract, canUpload, canDelete, shareEnabled, onShare }: {
  contract: DashboardContract;
  canUpload: boolean;
  canDelete: boolean;
  shareEnabled: boolean;
  onShare: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const id = contract.id ?? contract._id;
  if (!id) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" className="size-9 border-border text-muted-foreground" aria-label="Thao tác khác">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {canUpload && canAddContractVersion(contract) && (
            <DropdownMenuItem asChild>
              <Link href={routes.uploadVersion(id)}>
                <Upload aria-hidden="true" />
                Tải phiên bản mới
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={!shareEnabled} onSelect={onShare}>
            <Share2 aria-hidden="true" />
            Tóm tắt để chia sẻ
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                <Trash2 aria-hidden="true" />
                Xóa hợp đồng
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {deleting && (
        <ContractDeleteDialog contract={contract} onClose={() => setDeleting(false)} onDeleted={() => router.replace(routes.contracts)} />
      )}
    </>
  );
}

export function ContractDetailHeader({ data, contractId, contract, versions, busy, canReview, canUpload, canDelete, shareEnabled, onReview, onShare, onShowVersions }: {
  data: DashboardData;
  contractId: string;
  contract?: DashboardContract;
  versions: ContractVersionSummary[];
  busy: boolean;
  canReview: boolean;
  canUpload: boolean;
  canDelete: boolean;
  shareEnabled: boolean;
  onReview: (rerun: boolean) => void;
  onShare: () => void;
  onShowVersions: () => void;
}) {
  const back = useBackToContractList(data, contractId);
  const current = versions.find((version) => version.isCurrent);
  const review = current?.latestReview;
  const reviewed = contract?.status === "reviewed";
  const startable = contract?.status === "uploaded";
  const meta = contract ? [
    contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại",
    `Tạo ${formatContractDate(contract.createdAt)}`,
    `Cập nhật ${formatContractDate(contract.updatedAt)}`,
  ].join(" · ") : null;
  return (
    <header className="space-y-4">
      <Breadcrumb aria-label="Đường dẫn">
        <BreadcrumbList className="text-ui-meta">
          <BreadcrumbItem>
            <BreadcrumbLink asChild className="font-medium text-primary">
              <button type="button" onClick={back}>Hợp đồng</button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{contract?.title ?? "Chi tiết hợp đồng"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary">
            <FileText aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
              {contract?.title ?? <Skeleton className="inline-block h-7 w-72 max-w-full align-middle" />}
            </h1>
            {meta && <p className="m-0 text-ui-meta text-muted-foreground">{meta}</p>}
          </div>
        </div>
        {contract && (
          <div className="flex items-center gap-2">
            {canReview && reviewed && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onReview(true)}>
                <RotateCw aria-hidden="true" />
                Rà soát lại
              </Button>
            )}
            {canReview && startable && (
              <Button size="sm" disabled={busy} onClick={() => onReview(false)}>
                <Sparkles aria-hidden="true" />
                Bắt đầu rà soát
              </Button>
            )}
            <ContractMenu contract={contract} canUpload={canUpload} canDelete={canDelete} shareEnabled={shareEnabled} onShare={onShare} />
          </div>
        )}
      </div>
      <Card className="flex-row flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        {current && (
          <>
            <ContractVersionSwitcher contractId={contractId} versions={versions} onShowAll={onShowVersions} />
            <Separator orientation="vertical" className="hidden h-5! sm:block" />
          </>
        )}
        <span className="flex items-center gap-2 text-ui-meta text-muted-foreground">
          Kết quả AI <AiStatus contract={contract} review={review} />
        </span>
        <span className="flex items-center gap-2 text-ui-meta text-muted-foreground">
          Chuyên gia <ExpertStatus review={review} />
        </span>
      </Card>
    </header>
  );
}
