"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { riskCodeLabels } from "@/config/risk-display";
import { verificationFindingSchema, type VerificationFindingForm } from "@/schemas/verification-finding.schema";
import { changedFindingFields } from "@/lib/review/verification-workspace";
import type { ExpertCommand, ExpertWorkspace, VerifiedFinding } from "@/types/verification-workspace";

const field = "w-full rounded-lg border border-input bg-card px-3 py-2 text-ui leading-6 text-card-foreground placeholder:text-muted-foreground [color-scheme:light] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60";
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
      title: finding?.title ?? "", severity: finding?.severity ?? "medium", riskCode: finding?.riskCode ?? "OTHER",
      problem: finding?.problem.join("\n") ?? "", consequences: finding?.consequences.join("\n") ?? "", recommendations: finding?.recommendations.join("\n") ?? "",
      reason: "", clauseIndex: finding?.clause ? String(finding.clause.index) : "",
    },
  });
  const busy = pending || form.formState.isSubmitting;
  async function save(values: VerificationFindingForm) {
    const input = { title: values.title, severity: values.severity, riskCode: values.riskCode, problem: points(values.problem), consequences: points(values.consequences), recommendations: points(values.recommendations) };
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
      <DialogContent busy={busy} className="flex flex-col overflow-hidden [color-scheme:light] sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{finding ? "Điều chỉnh rủi ro" : "Bổ sung rủi ro"}</DialogTitle>
          <DialogDescription className="leading-6">Chỉ lưu khi bạn xác nhận. Mỗi ý trong các ô nội dung đặt trên một dòng.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(save)} className="flex min-h-0 flex-col gap-4">
          <fieldset disabled={busy} className="min-h-0 space-y-4 overflow-y-auto border-0 p-0 pr-1 text-ui">
            <label className="grid gap-2 font-medium">Tiêu đề<input {...form.register("title")} maxLength={300} className={field} aria-invalid={Boolean(form.formState.errors.title)} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 font-medium">Mức độ<select {...form.register("severity")} className={field}><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></label>
              <label className="grid gap-2 font-medium">Loại rủi ro<select {...form.register("riskCode")} className={field}>{Object.entries(riskCodeLabels).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            </div>
            {!finding && <label className="grid gap-2 font-medium">Điều khoản liên quan<select {...form.register("clauseIndex")} className={field}><option value="">Toàn hợp đồng / thiếu điều khoản</option>{clauses.map((clause) => <option key={clause._id} value={clause.index}>{clause.title || `Điều khoản ${clause.index}`}</option>)}</select></label>}
            {([{ key: "problem", label: "Vấn đề" }, { key: "consequences", label: "Hậu quả (không bắt buộc)" }, { key: "recommendations", label: "Khuyến nghị (không bắt buộc)" }, { key: "reason", label: "Lý do điều chỉnh / bổ sung (không bắt buộc)" }] as const).map(({ key, label }) => (
              <label key={key} className="grid gap-2 font-medium">{label}<textarea {...form.register(key)} rows={3} maxLength={key === "reason" ? 2000 : 40020} className={`${field} resize-y font-normal`} aria-invalid={Boolean(form.formState.errors[key])} /></label>
            ))}
            {Object.entries(form.formState.errors).map(([key, value]) => <p key={key} role="alert" className="m-0 text-rose-800">{value?.message}</p>)}
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-900">{error}</p>}
          </fieldset>
          <DialogFooter className="shrink-0 border-t border-border pt-4"><Button variant="outline" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" loading={busy}>Lưu thay đổi</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
