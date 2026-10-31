"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useExpertCommand, useVerificationWorkspace } from "./use-verification-workspace";
import { canEditVerification } from "@/lib/review/verification-workspace";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import type { ExpertCommand, VerifiedFinding } from "@/types/verification-workspace";

export type VerificationDialog = { mode: "add" } | { mode: "edit" | "reject" | "remove"; finding: VerifiedFinding } | { mode: "approve" | "return" };
export const verificationFindingId = (finding: VerifiedFinding) => (finding.id ?? finding._id)!;

export function useVerificationController(reviewId: string, expertId: string, attempt?: number) {
  const query = useVerificationWorkspace(reviewId, attempt);
  const workspace = query.data;
  const command = useExpertCommand(reviewId, workspace?.contract.id);
  const lock = useRef(false);
  const [dialog, setDialog] = useState<VerificationDialog | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "processed">(attempt ? "all" : "pending");
  const [pane, setPane] = useState<"findings" | "document">("findings");
  const [selection, setSelection] = useState<{ index: number; request: number } | null>(null);
  const editable = Boolean(workspace && !attempt && !workspace.historical && canEditVerification(workspace.verification, expertId) && !query.isError);
  const pendingCount = workspace?.findings.filter((finding) => !finding.verification).length ?? 0;

  async function execute(input: ExpertCommand) {
    if (attempt || workspace?.historical) return false;
    if (lock.current) return false;
    lock.current = true;
    try {
      await command.mutateAsync(input);
      toast.success(input.kind === "start" ? "Đã nhận yêu cầu xác minh" : input.kind === "approve" ? "Đã hoàn tất kiểm tra" : input.kind === "return" ? "Đã trả lại yêu cầu" : "Đã lưu thao tác xác minh");
      return true;
    } catch (error) {
      toast.error("Chưa hoàn tất thao tác", { description: verificationErrorMessage(error) });
      return false;
    } finally { lock.current = false; }
  }

  function openDialog(next: VerificationDialog) {
    command.reset();
    setDialog(next);
  }

  function locate(finding: VerifiedFinding) {
    if (!finding.clause) return;
    const index = finding.clause.index;
    setSelection((current) => ({ index, request: (current?.request ?? 0) + 1 }));
    setPane("document");
  }

  function decide(note: string) {
    if (dialog?.mode === "approve") return execute({ kind: "approve", ...(note ? { decisionNote: note } : {}) });
    if (dialog?.mode === "return") return execute({ kind: "return", reason: note });
    if (dialog?.mode === "remove") return execute({ kind: "remove", findingId: verificationFindingId(dialog.finding) });
    if (dialog?.mode === "reject") return execute({ kind: "decide", findingId: verificationFindingId(dialog.finding), input: { verdict: "rejected", reason: note } });
    return Promise.resolve(false);
  }

  return { query, workspace, command, dialog, closeDialog: () => setDialog(null), openDialog, filter, setFilter, pane, setPane, selection, locate, editable, disabled: !editable || command.isPending, pendingCount, processed: (workspace?.findings.length ?? 0) - pendingCount, execute, decide };
}
export type VerificationController = ReturnType<typeof useVerificationController>;
