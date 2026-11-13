"use client";

import Link from "next/link";
import { Layers, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useContractVersions } from "@/hooks/contracts/use-contracts";
import { trackingPresentation } from "@/components/contract/contract-tracking-status";
import { RiskBadge } from "@/components/contract/risk-badge";
import type { ContractVersionSummary } from "@/types/contracts";

const reviewStatusLabels: Record<NonNullable<ContractVersionSummary["latestReview"]>["status"], string> = {
  queued: "Đang chờ rà soát",
  running: "Đang rà soát",
  completed: "Đã rà soát",
  failed: "Rà soát chưa hoàn tất",
  cancelled: "Đã dừng rà soát",
};

const extractionLabels: Partial<Record<ContractVersionSummary["extractionStatus"], string>> = {
  pending: "Chưa có tệp",
  processing: "Đang đọc nội dung tệp…",
  failed: "Không đọc được tệp",
  unsupported: "Định dạng tệp chưa được hỗ trợ",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function ReviewSummary({ contractId, version }: { contractId: string; version: ContractVersionSummary }) {
  const review = version.latestReview;
  if (!review) return <p className="m-0 text-ui-meta text-muted-foreground">Chưa rà soát phiên bản này.</p>;
  const counts = review.findingCounts;
  const verification = review.verificationStatus ? trackingPresentation[review.verificationStatus] : null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-ui-meta">
      {review.status === "completed" && review.overallRiskLevel ? (
        <RiskBadge risk={review.overallRiskLevel} />
      ) : (
        <span className="text-muted-foreground">{reviewStatusLabels[review.status]}</span>
      )}
      {review.status === "completed" && counts && (
        <span className="text-muted-foreground">
          Cao {counts.high} · Trung bình {counts.medium} · Thấp {counts.low}
        </span>
      )}
      {verification && (
        <span className={`rounded-md border px-1.5 py-0.5 text-ui-caption font-medium ${verification.tone}`}>
          {verification.label}
        </span>
      )}
      <Link className="ml-auto font-medium text-blue-700 hover:underline" href={version.isCurrent && review.status === "completed" ? routes.contract(contractId) : routes.review(contractId, review.id)}>
        {review.status === "completed" ? "Xem kết quả phiên bản này" : "Xem lượt rà soát"}
      </Link>
    </div>
  );
}

function VersionItem({ contractId, version }: { contractId: string; version: ContractVersionSummary }) {
  const extraction = extractionLabels[version.extractionStatus];
  const meta = [
    version.uploadedBy?.name ? `Tải bởi ${version.uploadedBy.name}` : null,
    formatDateTime(version.uploadedAt),
    version.pageCount ? `${version.pageCount} trang` : null,
  ].filter(Boolean);
  return (
    <li className="relative pb-5 pl-7 last:pb-0">
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1.5 size-3 rounded-full border-2 ${
          version.isCurrent ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
        }`}
      />
      <div className="space-y-2 rounded-lg border border-border bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-ui-section font-semibold">Phiên bản {version.versionNumber}</h3>
          {version.isCurrent && <Badge variant="info">Hiện tại</Badge>}
          {version.note && <span className="min-w-0 text-ui text-slate-700 [overflow-wrap:anywhere]">· {version.note}</span>}
        </div>
        <p className="m-0 text-ui-meta text-muted-foreground">{meta.join(" · ")}</p>
        {extraction && version.extractionStatus !== "completed" && (
          <p className="m-0 text-ui-meta text-amber-800">{extraction}</p>
        )}
        <ReviewSummary contractId={contractId} version={version} />
      </div>
    </li>
  );
}

export function ContractVersionsPanel({ contractId, embedded = false, canUpload = true }: { contractId: string; embedded?: boolean; canUpload?: boolean }) {
  const versions = useContractVersions(contractId);
  const items = versions.data ?? [];
  return (
    <section
      aria-label="Phiên bản hợp đồng"
      className={embedded ? "bg-white" : "mt-7 overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]"}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-[#eaf1ff] text-[color:var(--accent)]">
            <Layers aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="m-0 text-ui-card font-semibold">Phiên bản hợp đồng</h2>
            <p className="mb-0 mt-1 text-ui text-[color:var(--muted)]">
              {items.length > 1
                ? `${items.length} phiên bản · Rà soát mới luôn chạy trên phiên bản hiện tại`
                : "Mỗi lần đối tác gửi lại hoặc sau đàm phán, hãy tải lên thành phiên bản mới"}
            </p>
          </div>
        </div>
        {canUpload && (
          <Button asChild size="sm" variant="outline">
            <Link href={routes.uploadVersion(contractId)}>
              <Upload aria-hidden="true" className="size-4" />
              Tải phiên bản mới
            </Link>
          </Button>
        )}
      </header>
      <div className="p-5">
        {versions.isPending && <p className="m-0 text-ui text-muted-foreground">Đang tải danh sách phiên bản…</p>}
        {versions.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-ui text-red-800">
            Chưa tải được danh sách phiên bản.
            <Button size="sm" variant="outline" onClick={() => void versions.refetch()}>
              Thử lại
            </Button>
          </div>
        )}
        {items.length > 0 && (
          <ol className="m-0 list-none p-0 [&>li:not(:last-child)]:before:absolute [&>li:not(:last-child)]:before:bottom-0 [&>li:not(:last-child)]:before:left-[5px] [&>li:not(:last-child)]:before:top-5 [&>li:not(:last-child)]:before:w-0.5 [&>li:not(:last-child)]:before:bg-slate-200">
            {items.map((version) => (
              <VersionItem key={version.id} contractId={contractId} version={version} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
