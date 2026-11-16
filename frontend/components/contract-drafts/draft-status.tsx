import type { DraftStatus } from "@/types/contract-drafts";
export const draftStatusLabels: Record<DraftStatus, string> = {
  draft: "Bản nháp",
  pending_approval: "Cần hoàn tất",
  approved: "Đã hoàn tất",
};
const colors: Record<DraftStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
};
export function DraftStatusBadge({ status }: { status: DraftStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}
    >
      {draftStatusLabels[status]}
    </span>
  );
}
