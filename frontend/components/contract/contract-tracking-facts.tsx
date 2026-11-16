import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { contractTrackingUpdate } from "@/lib/contracts/contract-tracking-update";
import { RiskBadge } from "./risk-badge";
import type { DashboardContract } from "@/types/contracts";

type Verification = NonNullable<DashboardContract["expertVerification"]>;

const expertStatus: Record<Verification["status"], { label: string; tone: "info" | "success" | "warning"; pulse: boolean }> = {
  requested: { label: "Chờ tiếp nhận", tone: "info", pulse: true },
  in_progress: { label: "Đang kiểm tra", tone: "info", pulse: true },
  approved: { label: "Đã xác nhận", tone: "success", pulse: false },
  returned: { label: "Đã trả lại", tone: "warning", pulse: false },
};

const shortDateTime = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatShort(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? shortDateTime.format(date) : null;
}

function PulseDot() {
  return <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5 lg:border-l lg:border-border lg:pl-5">
      <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Caption({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" }) {
  return (
    <p className={`m-0 text-ui-meta leading-5 ${tone === "warning" ? "text-amber-800" : "text-muted-foreground"}`}>
      {children}
    </p>
  );
}

export function AiResultFact({ contract }: { contract: DashboardContract }) {
  const risk = contract.currentVersion?.overallRiskLevel ?? contract.overallRiskLevel ?? "none";
  return (
    <Fact label="Kết quả AI">
      {contract.status === "reviewed" && <>
        <RiskBadge risk={risk} />
        <Caption>Đã rà soát xong</Caption>
      </>}
      {contract.status === "processing" && <>
        <Badge variant="info"><PulseDot />Đang phân tích</Badge>
        <Caption>AI đang đọc và rà soát hợp đồng</Caption>
      </>}
      {contract.status === "uploaded" && <>
        <Badge variant="neutral">Chưa rà soát</Badge>
        <Caption>Sẵn sàng để AI rà soát</Caption>
      </>}
      {contract.status === "unsupported" && <>
        <Badge variant="warning">Chưa hỗ trợ</Badge>
        <Caption>Loại tài liệu này chưa thể rà soát</Caption>
      </>}
      {contract.status === "archived" && <Badge variant="neutral">Đã lưu trữ</Badge>}
    </Fact>
  );
}

export function ExpertFact({ contract, onOpen }: { contract: DashboardContract; onOpen: () => void }) {
  const verification = contract.expertVerification;
  if (verification === undefined) return (
    <Fact label="Chuyên gia">
      <Badge variant="neutral">Không tải được</Badge>
      <Caption>Làm mới danh sách để thử lại</Caption>
    </Fact>
  );
  if (verification === null) return (
    <Fact label="Chuyên gia">
      <Badge variant="neutral">Chưa gửi</Badge>
      <Caption>{contract.status === "reviewed" ? "Có thể gửi từ trang báo cáo" : "Cần rà soát AI trước"}</Caption>
    </Fact>
  );
  const status = expertStatus[verification.status];
  const at = formatShort(contractTrackingUpdate(contract).at);
  const previousReview = verification.reviewId !== contract.latestReviewId;
  return (
    <Fact label="Chuyên gia">
      <Badge variant={status.tone}>{status.pulse && <PulseDot />}{status.label}</Badge>
      <Caption>{at ? `${at} · ` : ""}Lần {verification.attempt}</Caption>
      {previousReview && <Caption tone="warning">Áp dụng cho lượt rà soát trước</Caption>}
      <button
        type="button"
        onClick={onOpen}
        className="p-0 text-left text-ui-meta font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {verification.status === "returned" ? "Xem lý do trả lại" : "Xem thông tin xác minh"}
      </button>
    </Fact>
  );
}
