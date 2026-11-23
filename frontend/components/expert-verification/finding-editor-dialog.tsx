"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FindingEditorFields } from "./finding-editor-fields";
import { verificationFindingSchema, type VerificationFindingForm } from "@/schemas/verification-finding.schema";
import { changedFindingFields } from "@/lib/review/verification-workspace";
import type { ExpertCommand, ExpertWorkspace, VerifiedFinding } from "@/types/verification-workspace";

const points = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

export function FindingEditorDialog({ finding, clauses, pending, error, onClose, onCommand }: {
  finding?: VerifiedFinding;
  clauses: ExpertWorkspace["clauses"];
  pending: boolean;
  error: string;
  onClose: () => void;
  onCommand: (command: ExpertCommand) => Promise<boolean>;
}) {
  const form = useForm<VerificationFindingForm>({
    resolver: zodResolver(verificationFindingSchema),
    defaultValues: {
      title: finding?.title ?? "", checkGroup: finding?.checkGroup && finding.checkGroup !== "referral" ? finding.checkGroup : "clarity",
      problem: finding?.problem.join("\n") ?? "", consequences: finding?.consequences.join("\n") ?? "", recommendations: finding?.recommendations.join("\n") ?? "",
      reason: "", clauseIndex: finding?.clause ? String(finding.clause.index) : "",
    },
  });
  const busy = pending || form.formState.isSubmitting;
  async function save(values: VerificationFindingForm) {
    const input = { title: values.title, checkGroup: values.checkGroup, problem: points(values.problem), consequences: points(values.consequences), recommendations: points(values.recommendations) };
    const reason = values.reason ? { reason: values.reason } : {};
    let command: ExpertCommand;
    if (finding) {
      const changes = changedFindingFields(finding, input);
      if (!Object.keys(changes).length) { form.setError("root", { message: "Hãy thay đổi ít nhất một nội dung trước khi lưu." }); return; }
      command = { kind: "decide", findingId: (finding.id ?? finding._id)!, input: { verdict: "adjusted", ...changes, ...reason } };
    } else {
      command = { kind: "add", input: { ...input, ...reason, ...(values.clauseIndex !== "" ? { clauseIndex: Number(values.clauseIndex) } : {}) } };
    }
    if (await onCommand(command)) onClose();
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent busy={busy} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden border-[#e4e6df] bg-white p-0 text-[#292c28] [color-scheme:light] sm:max-w-[800px]">
        <DialogHeader className="shrink-0 border-b border-[#e4e6df] px-5 py-5 pr-12 text-left sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf1f7] text-[#315eac]">
              {finding ? <FilePenLine aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">{finding ? "Điều chỉnh vấn đề" : "Bổ sung vấn đề"}</DialogTitle>
              <DialogDescription className="text-sm leading-5 text-[#73766f]">Ghi nhận đánh giá của bạn vào kết quả xác minh hợp đồng.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(save)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            <FindingEditorFields form={form} clauses={clauses} editing={Boolean(finding)} busy={busy} />
          </div>
          <div className="shrink-0 border-t border-[#e4e6df] bg-[#fafbf9] px-5 py-3 sm:px-6">
            {(error || form.formState.errors.root) && <p role="alert" className="mb-3 mt-0 text-sm leading-5 text-rose-700">{error || form.formState.errors.root?.message}</p>}
            <DialogFooter className="flex-row items-center gap-3 sm:justify-between">
              <p className="m-0 mr-auto text-xs text-[#73766f]"><span className="text-rose-600">*</span> Bắt buộc</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
                <Button type="submit" loading={busy} className="bg-[#315eac] text-white hover:bg-[#264d90]">Lưu thay đổi</Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
