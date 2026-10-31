"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificationDate, verificationStatuses } from "@/lib/review/verification-display";
import type { VerificationController } from "@/hooks/expert-verification/use-verification-controller";

export function VerificationWorkspaceHeader({ controller }: { controller: VerificationController }) {
  const { workspace, query, command, editable, disabled, pendingCount, processed, execute, openDialog } = controller;
  if (!workspace) return null;
  const session = workspace.verification;
  return (
    <header className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <Link href={workspace.historical ? "/expert-verification/my-work" : "/expert-verification"} className="inline-flex items-center gap-2 text-ui-meta font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />{workspace.historical ? "Về công việc của tôi" : "Về hàng đợi"}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="m-0 break-words text-ui-dialog font-bold [overflow-wrap:anywhere]">{workspace.contract.title}</h1>
          <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Gửi {verificationDate(session.requestedAt)} · {typeof session.requestedBy === "object" ? session.requestedBy?.name ?? "Người gửi" : "Người gửi"}</p>
        </div>
        <span role="status" className={`rounded-full border px-3 py-1 text-ui-meta font-semibold ${verificationStatuses[session.status].tone}`}>{verificationStatuses[session.status].label}</span>
      </div>
      {workspace.historical && <p className="m-0 rounded-lg border border-blue-200 bg-blue-50 p-3 text-ui text-blue-950">Bản lưu lần xác minh {session.attempt} · Chỉ đọc. Nội dung phản ánh thời điểm kết thúc lần xác minh này, có thể khác phiên bản hợp đồng hiện tại.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="m-0 text-ui"><strong className="tabular-nums">Đã xử lý {processed}/{workspace.findings.length}</strong> điểm cần kiểm tra</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" disabled={query.isFetching || command.isPending} onClick={() => { void query.refetch(); }}>
            <RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />Làm mới
          </Button>
          {!workspace.historical && session.status === "requested" && <Button size="sm" loading={command.isPending} disabled={query.isError} onClick={() => { void execute({ kind: "start" }); }}>Nhận xác minh</Button>}
          {editable && (
            <>
              <Button variant="outline" size="sm" disabled={disabled} onClick={() => openDialog({ mode: "return" })}>Trả lại yêu cầu</Button>
              <Button size="sm" disabled={disabled || pendingCount > 0} title={pendingCount ? `Còn ${pendingCount} rủi ro chưa được xử lý` : undefined} onClick={() => openDialog({ mode: "approve" })}>Hoàn tất kiểm tra</Button>
            </>
          )}
        </div>
      </div>
      {session.status === "requested" && <p className="m-0 text-ui-meta text-muted-foreground">Bạn đang xem trước bản đã che. Nhận xác minh để bắt đầu xử lý; chuyên gia khác có thể tiếp nhận yêu cầu trong thời gian này.</p>}
      {!editable && session.status === "in_progress" && <p className="m-0 text-ui-meta text-muted-foreground">Chỉ chuyên gia đã nhận yêu cầu mới được thay đổi kết quả.</p>}
      <details className="text-ui">
        <summary className="cursor-pointer font-medium text-primary">Thông tin yêu cầu</summary>
        <p className="mb-0 mt-2 whitespace-pre-wrap break-words"><strong>Ghi chú người gửi:</strong> {session.requestNote || "Không có ghi chú."}</p>
        {session.decisionNote && <p className="mb-0 mt-2 whitespace-pre-wrap break-words"><strong>Kết luận / lý do trả lại:</strong> {session.decisionNote}</p>}
      </details>
    </header>
  );
}
