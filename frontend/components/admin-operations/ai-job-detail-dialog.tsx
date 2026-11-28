"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleStop,
  FileText,
  Flag,
  Loader2,
  Timer,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import {
  aiJobBadge,
  aiJobElapsedMs,
  aiJobErrorLabels,
  aiJobStageLabels,
  aiJobSteps,
  canCancelAiJob,
  formatDuration,
  type AiJobStepState,
} from "@/lib/admin/ai-job-labels";
import type { AiJob } from "@/types/admin-operations";
import { formatVietnamDateTime } from "@/lib/format/date-time";
import { nameInitials } from "@/lib/format/initials";
import { JobBadge } from "./ai-job-badge";

// Header colour and icon follow the job's badge.
const headerTone = {
  muted: { band: "from-slate-100 via-slate-50", tile: "bg-slate-700 text-white" },
  info: { band: "from-blue-100 via-blue-50", tile: "bg-blue-600 text-white" },
  success: { band: "from-emerald-100 via-emerald-50", tile: "bg-emerald-600 text-white" },
  danger: { band: "from-red-100 via-red-50", tile: "bg-red-600 text-white" },
  warning: { band: "from-amber-100 via-amber-50", tile: "bg-amber-500 text-white" },
} as const;

const stepStyle: Record<AiJobStepState, { dot: string; icon: ReactNode; text: string }> = {
  completed: { dot: "bg-emerald-500 text-white", icon: <CheckCircle2 size={16} aria-hidden="true" />, text: "text-emerald-700" },
  running: { dot: "bg-blue-600 text-white", icon: <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />, text: "text-blue-700" },
  failed: { dot: "bg-red-500 text-white", icon: <XCircle size={16} aria-hidden="true" />, text: "text-red-700" },
  stopped: { dot: "bg-amber-500 text-white", icon: <CircleStop size={16} aria-hidden="true" />, text: "text-amber-700" },
  pending: { dot: "bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200", icon: <Circle size={14} aria-hidden="true" />, text: "text-slate-500" },
};

function Stat({ icon, label, value, strong }: { icon: ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">{icon}{label}</dt>
      <dd className={`mt-1 tabular-nums ${strong ? "text-xl font-semibold text-slate-900" : "text-sm font-medium text-slate-800"}`}>{value}</dd>
    </div>
  );
}

function Person({ icon, label, title, subtitle }: { icon: ReactNode; label: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate font-medium text-slate-900" title={title}>{title}</p>
        <p className="truncate text-xs text-slate-500" title={subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

function Outcome({ job }: { job: AiJob }) {
  if (job.status === "cancelled")
    return (
      <div role="note" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <Ban size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Tác vụ đã bị hủy</p>
          <p className="mt-1 text-sm">{job.error ?? "Yêu cầu rà soát đã được hủy."}</p>
          <p className="mt-1 text-xs text-amber-800/80">Lượt rà soát đã được hoàn lại cho tài khoản.</p>
        </div>
      </div>
    );
  if (job.status === "failed")
    return (
      <div role="note" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">{job.errorCode ? aiJobErrorLabels[job.errorCode] : "Rà soát thất bại"}</p>
          {job.error && <p className="mt-1 wrap-break-word text-sm">{job.error}</p>}
        </div>
      </div>
    );
  if (job.stuck)
    return (
      <div role="note" className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{job.status === "queued" ? "Tác vụ chờ quá lâu" : "Tác vụ có thể đã bị treo"}</p>
          <p className="mt-1 text-sm">Thời gian vượt mức bình thường. Có thể hủy để hoàn lượt cho khách hàng rà soát lại.</p>
        </div>
      </div>
    );
  return null;
}

export function AiJobDetailDialog({
  job,
  now,
  onClose,
  onCancel,
}: {
  job: AiJob | null;
  now: number;
  onClose: () => void;
  onCancel: (job: AiJob) => void;
}) {
  const tone = job ? headerTone[aiJobBadge(job).tone] : headerTone.muted;
  const steps = job ? aiJobSteps(job) : [];
  return (
    <Dialog open={job !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className={`flex items-start gap-4 border-b border-slate-200 bg-linear-to-br ${tone.band} to-white px-6 pt-6 pb-5 pr-12`}>
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl shadow-sm ${tone.tile}`}>
            <FileText size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-lg" title={job?.contractTitle}>{job?.contractTitle}</DialogTitle>
            <DialogDescription className="mt-1">Tác vụ rà soát hợp đồng</DialogDescription>
            {job && <div className="mt-2"><JobBadge job={job} /></div>}
          </div>
        </div>
        {job && (
          <div className="grid gap-5 px-6 py-5 text-sm">
            <Outcome job={job} />
            <dl className="grid gap-3 sm:grid-cols-3">
              <Stat icon={<Timer size={13} aria-hidden="true" />} label="Thời gian xử lý" value={formatDuration(aiJobElapsedMs(job, now))} strong />
              <Stat icon={<CalendarClock size={13} aria-hidden="true" />} label="Tạo lúc" value={formatVietnamDateTime(job.createdAt)} />
              <Stat icon={<Flag size={13} aria-hidden="true" />} label="Kết thúc lúc" value={job.finishedAt ? formatVietnamDateTime(job.finishedAt) : "Chưa kết thúc"} />
            </dl>
            <div className="grid gap-5 sm:grid-cols-[1fr_1.1fr]">
              <section aria-labelledby="job-steps">
                <h3 id="job-steps" className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tiến trình</h3>
                <ol>
                  {steps.map((step, index) => {
                    const style = stepStyle[step.status];
                    return (
                      <li key={step.step} className="relative flex gap-3 pb-4 last:pb-0">
                        {index < steps.length - 1 && <span className="absolute top-8 bottom-0 left-3.75 w-px bg-slate-200" aria-hidden="true" />}
                        <span className={`relative grid size-8 shrink-0 place-items-center rounded-full ${style.dot}`}>{style.icon}</span>
                        <div className="pt-1">
                          <p className="font-medium text-slate-900">{step.label}</p>
                          <p className={`text-xs font-medium ${style.text}`}>{step.statusLabel}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {job.status === "running" && job.currentStage && (
                  <p className="mt-3 text-xs text-slate-500">
                    Đang ở bước: <strong className="text-slate-700">{aiJobStageLabels[job.currentStage]}</strong>
                    {job.stageDetail ? ` · ${job.stageDetail}` : ""}
                  </p>
                )}
              </section>
              <section aria-labelledby="job-people" className="grid content-start gap-3">
                <h3 id="job-people" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tài khoản</h3>
                <Person
                  icon={<Building2 size={18} aria-hidden="true" />}
                  label={job.account.type === "organization" ? "Tổ chức" : "Tài khoản cá nhân"}
                  title={job.account.name}
                  subtitle={job.account.type === "organization" ? "Lượt được trừ từ gói của tổ chức" : "Lượt được trừ từ gói cá nhân"}
                />
                <Person
                  icon={job.requestedBy ? nameInitials(job.requestedBy.name) || <UserRound size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}
                  label="Người yêu cầu"
                  title={job.requestedBy?.name ?? "Tài khoản đã xóa"}
                  subtitle={job.requestedBy?.email ?? "—"}
                />
              </section>
            </div>
          </div>
        )}
        {job && canCancelAiJob(job) && (
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button variant="destructive" onClick={() => onCancel(job)}>Hủy tác vụ và hoàn lượt</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
