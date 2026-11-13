"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronRight, FileText, MoreHorizontal, RotateCw, Share2, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const itemClass = "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-ui-meta text-slate-700 outline-none focus:bg-blue-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Thao tác khác"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:bg-slate-100"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-[80] min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {canUpload && canAddContractVersion(contract) && (
              <DropdownMenu.Item asChild className={itemClass}>
                <Link href={routes.uploadVersion(id)}>
                  <Upload aria-hidden="true" className="size-4" />
                  Tải phiên bản mới
                </Link>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item disabled={!shareEnabled} className={itemClass} onSelect={onShare}>
              <Share2 aria-hidden="true" className="size-4" />
              Tóm tắt để chia sẻ
            </DropdownMenu.Item>
            {canDelete && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item className={`${itemClass} text-destructive focus:bg-destructive/10`} onSelect={() => setDeleting(true)}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Xóa hợp đồng
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
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
      <nav aria-label="Đường dẫn" className="flex min-w-0 items-center gap-1.5 text-ui-meta text-muted-foreground">
        <button type="button" onClick={back} className="p-0 font-medium text-primary hover:underline">Hợp đồng</button>
        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
        <span aria-current="page" className="min-w-0 truncate">{contract?.title ?? "Chi tiết hợp đồng"}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <FileText aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
              {contract?.title ?? <span className="inline-block h-7 w-72 max-w-full animate-pulse rounded bg-muted align-middle motion-reduce:animate-none" />}
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-white px-4 py-3">
        {current && (
          <>
            <ContractVersionSwitcher contractId={contractId} versions={versions} onShowAll={onShowVersions} />
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
          </>
        )}
        <span className="flex items-center gap-2 text-ui-meta text-muted-foreground">
          Kết quả AI <AiStatus contract={contract} review={review} />
        </span>
        <span className="flex items-center gap-2 text-ui-meta text-muted-foreground">
          Chuyên gia <ExpertStatus review={review} />
        </span>
      </div>
    </header>
  );
}
