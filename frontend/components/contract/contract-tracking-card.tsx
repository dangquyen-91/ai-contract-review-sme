"use client";

import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contractTypeLabels, contractStatusLabels, contractRiskLabels, contractRiskTones, formatContractDate } from "@/config/contract-display";
import { verificationDate } from "@/lib/review/verification-display";
import { ContractDeleteButton } from "./contract-delete-button";
import { ContractVerificationDetails } from "./contract-verification-details";
import { ContractTrackingStatus, trackingPresentation } from "./contract-tracking-status";
import type { DashboardContract } from "@/types/contracts";

export function ContractTrackingCard({ contract, highlighted, canReview, canDelete, isReviewing, onReview, onDeleted }: {
  contract: DashboardContract; highlighted: boolean; canReview: boolean; canDelete: boolean;
  isReviewing: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; onDeleted?: () => void;
}) {
  const [tracking, setTracking] = useState(false);
  const verification = contract.expertVerification;
  const oldReview = Boolean(verification && verification.reviewId !== contract.latestReviewId);
  const reviewed = contract.status === "reviewed";
  const returned = verification?.status === "returned";
  const risk = contract.currentVersion?.overallRiskLevel ?? contract.overallRiskLevel ?? "none";
  return (
    <article className={`min-w-0 space-y-4 rounded-xl border bg-card p-4 text-card-foreground transition-[border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-[0_6px_22px_-12px_rgb(37_99_235_/_0.3)] focus-within:border-blue-300 motion-reduce:transition-none sm:p-5 ${highlighted ? "border-emerald-300 ring-2 ring-emerald-100" : returned ? "border-amber-200 border-l-4 border-l-amber-400" : "border-border"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><FileText aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0">
            <h3 className="m-0 break-words text-ui-section font-semibold [overflow-wrap:anywhere]">{contract.title}</h3>
            <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại"} · Tải lên {formatContractDate(contract.createdAt)}</p>
          </div>
        </div>
        <ContractTrackingStatus contract={contract} oldReview={oldReview} />
      </header>
      <div className={`space-y-2 rounded-lg p-3 ${returned ? "bg-amber-50/70" : "bg-muted/40"}`}>
        <div className="flex items-start gap-2">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 text-ui-meta font-medium">{verification ? trackingPresentation[verification.status].detail : verification === undefined ? "Chưa tải được trạng thái xác minh" : "Chưa gửi chuyên gia"}</span>
        </div>
        {verification ? <>
          <p className="m-0 text-ui-meta text-muted-foreground">Gửi {verificationDate(verification.requestedAt)} · Lần {verification.attempt}</p>
          {oldReview && <p className="m-0 text-ui-meta text-amber-900">Yêu cầu thuộc lượt rà soát trước, không xác nhận kết quả AI hiện tại đã được chuyên gia kiểm tra.</p>}
        </> : <p className="m-0 text-ui-meta text-muted-foreground">{verification === undefined ? "Hãy làm mới danh sách để kiểm tra trạng thái." : reviewed ? "Mở báo cáo để nhờ chuyên gia kiểm tra thêm kết quả AI." : "Hoàn tất rà soát AI trước khi gửi chuyên gia kiểm tra."}</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2 text-ui-meta">
          {verification && <span className="text-muted-foreground">AI: {contractStatusLabels[contract.status]}</span>}
          {reviewed && <><span className="text-muted-foreground">Mức rủi ro hiện tại</span><Badge variant={contractRiskTones[risk]}>{contractRiskLabels[risk]}</Badge></>}
          <span className="text-muted-foreground">Cập nhật {formatContractDate(contract.updatedAt)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview && <Button size="sm" variant={reviewed && !returned ? "default" : "outline"} disabled={isReviewing || contract.status === "archived"} onClick={() => onReview(contract)}>
            {reviewed ? "Xem báo cáo rà soát" : contract.status === "processing" ? "Theo dõi xử lý" : contract.status === "unsupported" ? "Xem tài liệu" : "Bắt đầu rà soát"}
          </Button>}
          {verification && <Button size="sm" variant={returned ? "default" : "outline"} onClick={() => setTracking(true)}>{returned ? "Xem lý do trả lại" : "Xem thông tin xác minh"}</Button>}
          {canDelete && <ContractDeleteButton contract={contract} onDeleted={onDeleted} />}
        </div>
      </footer>
      {tracking && verification && <ContractVerificationDetails contract={contract} onClose={() => setTracking(false)} onOpenReport={() => onReview(contract)} />}
    </article>
  );
}
