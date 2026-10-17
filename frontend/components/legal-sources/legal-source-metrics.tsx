import { Library, Scale, Files, ListTree } from "lucide-react";

const metrics = [
  { label: "Tổng nguồn", icon: Library, tone: "border-blue-100 bg-[#f4f8ff]", iconTone: "bg-blue-100 text-blue-700" },
  { label: "Văn bản pháp luật", icon: Scale, tone: "border-emerald-100 bg-[#f3faf8]", iconTone: "bg-emerald-100 text-emerald-700" },
  { label: "Mẫu hợp đồng", icon: Files, tone: "border-violet-100 bg-violet-50", iconTone: "bg-violet-100 text-violet-700" },
  { label: "Đoạn tham chiếu", icon: ListTree, tone: "border-amber-100 bg-[#fffaf0]", iconTone: "bg-amber-100 text-amber-700" },
];

export function LegalSourceMetrics({ counts, pending }: { counts: number[] | null; pending: boolean }) {
  return <dl aria-label="Thống kê kho pháp lý" aria-busy={pending} className="grid grid-cols-2 gap-3 py-5 sm:gap-4 sm:py-6 xl:grid-cols-4">
    {metrics.map(({ label, icon: Icon, tone, iconTone }, index) => <div key={label} className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${tone}`}>
      <dt className="flex min-h-10 items-start justify-between gap-2 text-ui-meta font-medium leading-5 text-slate-700 sm:items-center sm:text-sm">
        <span className="min-w-0 break-words">{label}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 ${iconTone}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
      </dt>
      <dd aria-label={pending ? "Đang tải" : undefined} className={`mt-4 text-3xl font-semibold tabular-nums ${pending ? "text-slate-300 motion-safe:animate-pulse" : "text-slate-900"}`}>{counts ? counts[index].toLocaleString("vi-VN") : "—"}</dd>
    </div>)}
  </dl>;
}
