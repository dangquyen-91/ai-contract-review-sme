"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useVerificationController, verificationFindingId } from "@/hooks/expert-verification/use-verification-controller";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import { FindingEditorDialog } from "./finding-editor-dialog";
import { VerificationDecisionDialog } from "./verification-decision-dialog";
import { VerificationDocument } from "./verification-document";
import { VerificationHistory } from "./verification-history";
import { VerificationWorkspaceHeader } from "./verification-workspace-header";
import { VerificationFindingsPane } from "./verification-findings-pane";

export function VerificationWorkspace({ reviewId, expertId, attempt }: { reviewId: string; expertId: string; attempt?: number }) {
  const controller = useVerificationController(reviewId, expertId, attempt);
  const { query, workspace, command, dialog, closeDialog, pane, setPane, selection, editable, execute, decide } = controller;
  if (query.isPending) return <p role="status" className="py-12 text-ui text-muted-foreground">Đang tải workspace đã che thông tin…</p>;
  if (!workspace) {
    return (
      <section role="alert" className="space-y-4 rounded-xl border border-border bg-card p-6">
        <p>{verificationErrorMessage(query.error)}</p>
        <Button variant="outline" onClick={() => { void query.refetch(); }}>Thử tải lại</Button>
        <Button asChild variant="ghost"><Link href={attempt ? "/expert-verification/my-work" : "/expert-verification"}>{attempt ? "Về công việc của tôi" : "Về hàng đợi"}</Link></Button>
      </section>
    );
  }
  return (
    <section className="space-y-4 text-card-foreground">
      <VerificationWorkspaceHeader controller={controller} />
      {query.isError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui text-amber-950">Chưa cập nhật được workspace. Các thao tác chỉnh sửa đang tạm khóa; hãy làm mới để tiếp tục.</p>}
      {command.error && !dialog && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-ui text-rose-950">{verificationErrorMessage(command.error)}</p>}
      <div role="group" aria-label="Chọn nội dung đối chiếu" className="flex gap-2 lg:hidden">
        <Button size="sm" variant={pane === "findings" ? "secondary" : "ghost"} aria-pressed={pane === "findings"} onClick={() => setPane("findings")}>Điểm cần kiểm tra</Button>
        <Button size="sm" variant={pane === "document" ? "secondary" : "ghost"} aria-pressed={pane === "document"} onClick={() => setPane("document")}>Văn bản</Button>
      </div>
      <div className="grid min-w-0 gap-4 lg:h-[min(76dvh,900px)] lg:min-h-96 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <VerificationFindingsPane controller={controller} />
        <section aria-label="Văn bản đối chiếu đã che" className={`${pane === "document" ? "flex" : "hidden"} h-[70dvh] min-h-96 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex lg:h-auto lg:min-h-0`}>
          <VerificationDocument workspace={workspace} selection={selection} />
        </section>
      </div>
      <VerificationHistory history={workspace.actions} />
      {dialog && editable && (dialog.mode === "add" || dialog.mode === "edit") && (
        <FindingEditorDialog
          key={dialog.mode === "edit" ? verificationFindingId(dialog.finding) : "add"}
          finding={dialog.mode === "edit" ? dialog.finding : undefined}
          clauses={workspace.clauses} pending={command.isPending}
          error={command.error ? verificationErrorMessage(command.error) : ""}
          onClose={closeDialog} onCommand={execute}
        />
      )}
      {dialog && editable && dialog.mode !== "add" && dialog.mode !== "edit" && (
        <VerificationDecisionDialog
          mode={dialog.mode} pending={command.isPending}
          error={command.error ? verificationErrorMessage(command.error) : ""}
          onClose={closeDialog} onSubmit={decide}
        />
      )}
    </section>
  );
}
