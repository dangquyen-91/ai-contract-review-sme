"use client";

import { Button } from "@/components/ui/button";
import { useVerificationController, verificationFindingId } from "@/hooks/expert-verification/use-verification-controller";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import { FindingEditorDialog } from "./finding-editor-dialog";
import { VerificationDecisionDialog } from "./verification-decision-dialog";
import { VerificationDocument } from "./verification-document";
import { VerificationHistory } from "./verification-history";
import { VerificationWorkspaceHeader } from "./verification-workspace-header";
import { VerificationFindingsPane } from "./verification-findings-pane";
import { VerificationProgress } from "./verification-progress";
import { VerificationBackButton } from "./verification-back-button";
import { VerificationViewControls } from "./verification-view-controls";

export function VerificationWorkspace({ reviewId, expertId, attempt }: { reviewId: string; expertId: string; attempt?: number }) {
  const controller = useVerificationController(reviewId, expertId, attempt);
  const { query, workspace, command, dialog, closeDialog, pane, setPane, viewMode, selection, editable, execute, decide } = controller;
  if (query.isPending) return <p role="status" className="py-12 text-ui text-muted-foreground">Đang tải workspace đã che thông tin…</p>;
  if (!workspace) {
    return (
      <section role="alert" className="space-y-4 rounded-xl border border-border bg-card p-6">
        <p>{verificationErrorMessage(query.error)}</p>
        <Button variant="outline" onClick={() => { void query.refetch(); }}>Thử tải lại</Button>
        <VerificationBackButton historical={Boolean(attempt)} />
      </section>
    );
  }
  return (
    <section className="space-y-4 text-card-foreground">
      <VerificationWorkspaceHeader controller={controller} />
      <VerificationProgress controller={controller} />
      {query.isError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui text-amber-950">Chưa cập nhật được workspace. Các thao tác chỉnh sửa đang tạm khóa; hãy làm mới để tiếp tục.</p>}
      {command.error && !dialog && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-ui text-rose-950">{verificationErrorMessage(command.error)}</p>}
      <VerificationViewControls controller={controller} />
      <div data-view-mode={viewMode} className={`grid min-w-0 gap-4 lg:h-[min(76dvh,900px)] lg:min-h-96 ${viewMode === "split" ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "lg:grid-cols-1"}`}>
        <VerificationFindingsPane controller={controller} />
        <section id="verification-document" aria-label="Văn bản đối chiếu đã che" className={`${pane === "document" ? "flex" : "hidden"} h-[70dvh] min-h-96 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card ${viewMode === "findings" ? "lg:hidden" : "lg:flex"} lg:h-auto lg:min-h-0`}>
          <VerificationDocument workspace={workspace} selection={selection} active={pane === "document"} layout={viewMode}
            selectedTitle={workspace.findings.find((finding) => verificationFindingId(finding) === controller.findingSelection?.id)?.title} />
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
          findings={workspace.findings} onReview={() => { closeDialog(); controller.setFilter("all"); setPane("findings"); }}
          error={command.error ? verificationErrorMessage(command.error) : ""}
          onClose={closeDialog} onSubmit={decide}
        />
      )}
    </section>
  );
}
