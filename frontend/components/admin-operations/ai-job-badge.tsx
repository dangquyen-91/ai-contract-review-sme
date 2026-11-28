import { aiJobBadge } from "@/lib/admin/ai-job-labels";
import type { AiJob } from "@/types/admin-operations";

export const aiJobToneClass = {
  muted: "bg-slate-50 text-slate-600 ring-slate-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-300",
} as const;

export function JobBadge({ job }: { job: Pick<AiJob, "status" | "stuck"> }) {
  const badge = aiJobBadge(job);
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${aiJobToneClass[badge.tone]}`}>
      {badge.label}
    </span>
  );
}
