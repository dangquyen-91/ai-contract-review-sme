"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { expertVerificationKeys } from "@/lib/query-keys/expert-verification";
import { nextPendingFinding, verificationSummary } from "@/lib/review/verification-summary";
import { useExpertCommand, useVerificationWorkspace } from "./use-verification-workspace";
import { canEditVerification } from "@/lib/review/verification-workspace";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import type { ExpertCommand, ExpertWorkspace, VerifiedFinding } from "@/types/verification-workspace";

export type VerificationDialog = { mode: "add" } | { mode: "edit" | "reject" | "remove"; finding: VerifiedFinding } | { mode: "approve" | "return" };
export const verificationFindingId = (finding: VerifiedFinding) => (finding.id ?? finding._id)!;

export function useVerificationController(reviewId: string, expertId: string, attempt?: number) {
  const query = useVerificationWorkspace(reviewId, attempt);
  const client = useQueryClient();
  const workspace = query.data;
  const command = useExpertCommand(reviewId, workspace?.contract.id);
  const lock = useRef(false);
  const [dialog, setDialog] = useState<VerificationDialog | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "processed">(attempt ? "all" : "pending");
  const [pane, setPane] = useState<"findings" | "document">("findings");
  const [viewMode, setViewMode] = useState<"split" | "findings" | "document">("split");
  const [selection, setSelection] = useState<{ index: number; request: number; focus?: boolean } | null>(null);
  const [findingSelection, setFindingSelection] = useState<{ id: string; request: number } | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<{ id?: string; title: string; removed: boolean } | null>(null);
  const editable = Boolean(workspace && !attempt && !workspace.historical && canEditVerification(workspace.verification, expertId) && !query.isError);
  const pendingCount = workspace?.findings.filter((finding) => !finding.verification).length ?? 0;
  const summary = verificationSummary(workspace?.findings ?? []);

  async function execute(input: ExpertCommand) {
    if (attempt || workspace?.historical) return false;
    if (lock.current) return false;
    lock.current = true;
    try {
      await command.mutateAsync(input);
      if (["decide", "add", "remove"].includes(input.kind)) {
        const fresh = client.getQueryData<ExpertWorkspace>(expertVerificationKeys.workspace(reviewId));
        const previousIds = new Set(workspace?.findings.map(verificationFindingId));
        const addedItems = input.kind === "add" ? fresh?.findings.filter((item) => !previousIds.has(verificationFindingId(item)) && item.title === input.input.title) ?? [] : [];
        const added = addedItems.length === 1 ? addedItems[0] : undefined;
        const id = "findingId" in input ? input.findingId : added ? verificationFindingId(added) : undefined;
        const item = fresh?.findings.find((finding) => verificationFindingId(finding) === id) ?? workspace?.findings.find((finding) => verificationFindingId(finding) === id);
        setLastSaved({ id, title: item?.title ?? (input.kind === "add" ? input.input.title : "Thao tác xác minh"), removed: input.kind === "remove" });
        if (id) setSaved((current) => ({ ...current, [id]: new Date().toISOString() }));
      }
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
    setFindingSelection((current) => ({ id: verificationFindingId(finding), request: (current?.request ?? 0) + 1 }));
    setSelection((current) => ({ index, request: (current?.request ?? 0) + 1 }));
    if (viewMode === "findings") setViewMode("split");
    setPane("document");
  }

  function selectFinding(finding: VerifiedFinding) {
    setFindingSelection((current) => ({ id: verificationFindingId(finding), request: (current?.request ?? 0) + 1 }));
    setPane("findings");
    if (viewMode === "document") setViewMode("split");
    if (finding.clause) setSelection((current) => ({ index: finding.clause!.index, request: (current?.request ?? 0) + 1, focus: false }));
    else setSelection(null);
  }

  function nextPending() {
    const next = nextPendingFinding(workspace?.findings ?? [], findingSelection?.id);
    if (!next) return;
    setFilter("pending");
    selectFinding(next);
  }

  function showLastSaved() {
    const item = workspace?.findings.find((finding) => verificationFindingId(finding) === lastSaved?.id);
    if (!item) return;
    setFilter("all");
    selectFinding(item);
  }

  function decide(note: string) {
    if (dialog?.mode === "approve") return pendingCount ? Promise.resolve(false) : execute({ kind: "approve", ...(note ? { decisionNote: note } : {}) });
    if (dialog?.mode === "return") return execute({ kind: "return", reason: note });
    if (dialog?.mode === "remove") return execute({ kind: "remove", findingId: verificationFindingId(dialog.finding) });
    if (dialog?.mode === "reject") return execute({ kind: "decide", findingId: verificationFindingId(dialog.finding), input: { verdict: "rejected", reason: note } });
    return Promise.resolve(false);
  }

  return { query, workspace, command, dialog, closeDialog: () => setDialog(null), openDialog, filter, setFilter, pane, setPane, viewMode, setViewMode, selection, locate, selectFinding, findingSelection, saved, lastSaved, showLastSaved, nextPending, summary, editable, disabled: !editable || command.isPending, pendingCount, processed: (workspace?.findings.length ?? 0) - pendingCount, execute, decide };
}
export type VerificationController = ReturnType<typeof useVerificationController>;
