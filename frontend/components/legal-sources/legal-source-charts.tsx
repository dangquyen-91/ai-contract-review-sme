"use client";

import { ChartNoAxesCombined, ChartPie, ArrowDown, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getLegalSourceAnalytics } from "@/lib/legal-source-analytics";
import type { SourceGroup } from "@/lib/legal-source-filtering";
import { LegalSourceTypeChart } from "./legal-source-type-chart";
import { LegalSourceProcessingChart } from "./legal-source-processing-chart";

type Analytics = ReturnType<typeof getLegalSourceAnalytics>;

export function LegalSourceCharts({ analytics, total, pending, unavailable, onSelectType, onSelectGroup }: {
  analytics: Analytics; total: number; pending: boolean; unavailable: boolean;
  onSelectType: (type: string) => void; onSelectGroup: (group: SourceGroup) => void;
}) {
  const populated = !pending && !unavailable && total > 0;
  const completed = analytics.processing.find((item) => item.key === "completed")?.count ?? 0;
  const placeholder = unavailable ? "Chưa tải được dữ liệu phân tích. Hãy thử làm mới." : pending ? "Đang tải dữ liệu phân tích…" : "Thêm nguồn đầu tiên để xem phân tích kho pháp lý.";
  const empty = <div role="status" className="mt-5 flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-ui text-slate-500"><Layers3 aria-hidden="true" className="size-8 text-slate-300" />{placeholder}</div>;
  return <section aria-label="Phân tích kho pháp lý" className="mb-6 grid gap-5 text-card-foreground lg:grid-cols-2">
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_-12px_#14213d18] sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><ChartPie aria-hidden="true" className="size-5" /></span><div><h2 className="text-ui-section font-semibold tracking-tight text-slate-900">Cơ cấu nguồn pháp lý</h2><p className="mt-1 text-ui-meta text-slate-500">Phân bố theo loại tài liệu trong kho.</p></div></div>
        {populated && <span className="rounded-full border border-blue-100 bg-blue-50/70 px-2.5 py-1 text-ui-caption font-medium text-blue-700">{analytics.types.filter((item) => item.count > 0).length} loại nguồn</span>}
      </header>
      {populated ? <LegalSourceTypeChart items={analytics.types} total={total} onSelectType={onSelectType} /> : empty}
    </article>
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_24px_-12px_#14213d18] sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ChartNoAxesCombined aria-hidden="true" className="size-5" /></span><div><h2 className="text-ui-section font-semibold tracking-tight text-slate-900">Trạng thái xử lý tài liệu</h2><p className="mt-1 text-ui-meta text-slate-500">Theo dõi tiến trình của toàn bộ nguồn.</p></div></div>
        {populated && <span className="rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-ui-caption font-medium text-emerald-700">{Math.round(completed / total * 100)}% hoàn tất</span>}
      </header>
      {populated ? <>
        <LegalSourceProcessingChart items={analytics.processing} />
        <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button variant="outline" size="sm" className="h-auto min-h-10 whitespace-normal py-2" onClick={() => onSelectGroup("processing")}><ArrowDown aria-hidden="true" />Xem nguồn đang xử lý</Button><Button variant="ghost" size="sm" className="h-auto min-h-10 whitespace-normal py-2" onClick={() => onSelectGroup("failed")}>Xem nguồn lỗi</Button></div>
      </> : empty}
    </article>
  </section>;
}
