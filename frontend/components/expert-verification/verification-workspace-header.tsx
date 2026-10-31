"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verificationStatuses } from "@/lib/review/verification-display";
import type { VerificationController } from "@/hooks/expert-verification/use-verification-controller";
import { VerificationBackButton } from "./verification-back-button";
import { VerificationRequestInfo } from "./verification-request-info";

export function VerificationWorkspaceHeader({ controller }: { controller: VerificationController }) {
  const { workspace, query, command, editable, disabled, pendingCount, execute, openDialog } = controller;
  if (!workspace) return null;
  const session = workspace.verification;
  return (
    <header className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerificationBackButton historical={workspace.historical} />
        <span role="status" className={`rounded-full border px-3 py-1 text-ui-meta font-semibold ${verificationStatuses[session.status].tone}`}>{verificationStatuses[session.status].label}</span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="m-0 break-words text-ui-dialog font-bold [overflow-wrap:anywhere]">{workspace.contract.title}</h1>
        </div>
      </div>
      {workspace.historical && <p className="m-0 rounded-lg border border-blue-200 bg-blue-50 p-3 text-ui text-blue-950">Bản lưu lần xác minh {session.attempt} · Chỉ đọc. Nội dung phản ánh thời điểm kết thúc lần xác minh này, có thể khác phiên bản hợp đồng hiện tại.</p>}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
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
      {session.status === "requested" && <p className="m-0 text-ui-meta text-muted-foreground">Bản xem trước đã che thông tin. Nhận xác minh để bắt đầu kiểm tra.</p>}
      {!editable && session.status === "in_progress" && <p className="m-0 text-ui-meta text-muted-foreground">Chỉ chuyên gia đã nhận yêu cầu mới được thay đổi kết quả.</p>}
      <VerificationRequestInfo verification={session} />
    </header>
  );
}
