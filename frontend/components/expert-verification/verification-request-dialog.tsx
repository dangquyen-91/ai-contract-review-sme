"use client";

import { Check, Clock3, CornerUpLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verificationDate, verificationStatuses } from "@/lib/review/verification-display";
import type { ExpertVerification } from "@/types/expert-verification";

export function VerificationRequestDialog({ title, verification, refreshing, error, onClose, onRefresh, onResend }: {
  title: string;
  verification: ExpertVerification;
  refreshing: boolean;
  error?: string;
  onClose: () => void;
  onRefresh: () => void;
  onResend: () => void;
}) {
  const { status } = verification;
  const finished = status === "approved" || status === "returned";
  const expert = typeof verification.expertId === "object" ? verification.expertId?.name : undefined;
  const steps = [
    { label: "Đã gửi yêu cầu", done: true, active: false, date: verification.requestedAt, detail: "Đã gửi đến hàng đợi chuyên gia LawScan." },
    { label: "Chuyên gia tiếp nhận", done: status !== "requested", active: status === "in_progress", date: verification.assignedAt,
      detail: expert ? `Chuyên gia: ${expert}` : status === "requested" ? "Đang chờ chuyên gia tiếp nhận." : "Yêu cầu đã được tiếp nhận." },
    { label: status === "returned" ? "Đã trả lại yêu cầu" : status === "approved" ? "Đã được chuyên gia kiểm tra" : "Kết thúc xác minh",
      done: finished, active: false, date: verification.completedAt,
      detail: finished ? (status === "returned" ? "Xem lý do trả lại bên dưới." : "Chuyên gia đã hoàn tất kiểm tra.") : "Chưa có kết luận của chuyên gia." },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-card text-card-foreground [color-scheme:light] sm:max-w-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-ui-dialog leading-7">Yêu cầu chuyên gia kiểm tra</DialogTitle>
          <DialogDescription className="break-words text-ui leading-6 text-muted-foreground [overflow-wrap:anywhere]">{title}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto pr-1 text-ui leading-6">
          <div role="status" aria-atomic="true">
            <span key={status} className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-ui-meta font-semibold animate-in fade-in duration-200 motion-reduce:animate-none ${verificationStatuses[status].tone}`}>
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full bg-current ${status === "requested" ? "animate-pulse [animation-duration:2s] motion-reduce:animate-none" : ""}`} />
              {verificationStatuses[status].label}
            </span>
          </div>
          {error && <p role="alert" className="m-0 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">{error}</p>}
          <ol aria-label="Tiến trình xác minh" className="m-0 list-none p-0">
            {steps.map((step, index) => (
              <li key={index} aria-current={step.active || (index === 0 && status === "requested") ? "step" : undefined} className={`relative flex items-start gap-3 ${index < steps.length - 1 ? "pb-6" : ""}`}>
                {index < steps.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 transition-colors duration-200 motion-reduce:transition-none ${index === 0 && status !== "requested" ? "bg-emerald-200" : "bg-border"}`} />}
                <span aria-hidden="true" className={`relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,box-shadow] duration-200 motion-reduce:transition-none ${index === 2 && status === "returned" ? "border-amber-200 bg-amber-50 text-amber-900" : step.active ? "border-primary/40 bg-accent text-primary ring-4 ring-primary/10" : step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-card text-muted-foreground"}`}>
                  {index === 2 && status === "returned" ? <CornerUpLeft className="size-4" /> : step.active ? <Clock3 className="size-4" /> : step.done ? <Check className="size-4" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="m-0 font-semibold">{step.label}{step.active && <span className="ml-2 text-ui-meta font-normal text-primary">Đang kiểm tra</span>}</p>
                  <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{step.detail}</p>
                  {step.date && <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{verificationDate(step.date)}</p>}
                </div>
              </li>
            ))}
          </ol>
          <section className="rounded-lg border border-border bg-muted/40 p-3">
            <h3 className="m-0 text-ui font-semibold">Ghi chú đã gửi</h3>
            <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{verification.requestNote || "Bạn không gửi kèm ghi chú."}</p>
          </section>
          {finished && (
            <section className={`rounded-lg border p-3 ${verificationStatuses[status].tone}`}>
              <h3 className="m-0 text-ui font-semibold">{status === "returned" ? "Lý do trả lại" : "Kết luận của chuyên gia"}</h3>
              <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{verification.decisionNote || (status === "returned" ? "Chưa tải được lý do trả lại. Hãy cập nhật trạng thái." : "Chuyên gia đã hoàn tất kiểm tra và không để lại ghi chú bổ sung.")}</p>
            </section>
          )}
          {!finished && <p className="m-0 text-ui-meta text-muted-foreground">Trạng thái tự cập nhật. Bạn có thể đóng hộp thoại và tiếp tục đọc kết quả; hãy chờ yêu cầu kết thúc trước khi rà soát lại.</p>}
        </div>
        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:block">
            <Button variant="ghost" size="sm" disabled={refreshing} aria-busy={refreshing} onClick={onRefresh}>
              <RefreshCw aria-hidden="true" className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />
              Làm mới
            </Button>
            {!finished && <p className="m-0 text-ui-caption text-muted-foreground sm:mt-1">Trạng thái tự cập nhật</p>}
            <span role="status" className="sr-only">{refreshing ? "Đang cập nhật trạng thái yêu cầu" : ""}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant={status === "returned" ? "outline" : "default"} onClick={onClose}>Đóng</Button>
            {status === "returned" && <Button size="sm" onClick={() => { onClose(); onResend(); }}>Gửi lại yêu cầu</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
