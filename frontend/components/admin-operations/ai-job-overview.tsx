import type { ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { aiJobErrorLabels, aiUsageKindLabels, formatDuration } from "@/lib/admin/ai-job-labels";
import type { AiJobOverview } from "@/types/admin-operations";

function Kpi({ icon, label, value, hint, alert, onClick }: { icon: ReactNode; label: string; value: string; hint: string; alert?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className={`grid size-9 place-items-center rounded-lg ${alert ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-slate-500">{label}</span>
        <span className="block text-2xl font-semibold tabular-nums text-slate-900">{value}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
    </>
  );
  const frame = `flex items-center gap-3 rounded-xl border bg-white p-4 text-left ${alert ? "border-amber-300" : "border-slate-200"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${frame} transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300`}>{body}</button>
  ) : (
    <div className={frame}>{body}</div>
  );
}

export function AiJobOverviewPanel({ overview, onShowStuck }: { overview: AiJobOverview; onShowStuck: () => void }) {
  const { last24h } = overview;
  const failures = overview.errors.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="mb-6 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Clock3 size={18} aria-hidden="true" />} label="Đang chờ / đang xử lý" value={`${overview.queued} / ${overview.running}`} hint="Tác vụ rà soát chưa xong" />
        <Kpi
          icon={<AlertTriangle size={18} aria-hidden="true" />}
          label="Có thể bị treo"
          value={String(overview.stuck)}
          hint={overview.stuck ? "Nhấn để xem và xử lý" : "Không có tác vụ treo"}
          alert={overview.stuck > 0}
          onClick={overview.stuck ? onShowStuck : undefined}
        />
        <Kpi
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
          label="Tỷ lệ thành công 24 giờ"
          value={last24h.successRate === null ? "—" : `${Math.round(last24h.successRate)}%`}
          hint={`${last24h.completed} hoàn tất · ${last24h.failed} thất bại · ${last24h.cancelled} đã hủy`}
        />
        <Kpi icon={<Activity size={18} aria-hidden="true" />} label="Thời gian rà soát trung bình" value={formatDuration(last24h.averageDurationMs)} hint="Các tác vụ hoàn tất trong 24 giờ" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="ai-errors" className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 id="ai-errors" className="text-sm font-semibold text-slate-900">Nguyên nhân thất bại trong 24 giờ</h3>
          {failures === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Không có tác vụ thất bại.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {overview.errors.map((row) => (
                <li key={row.code} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate text-slate-700">{aiJobErrorLabels[row.code] ?? row.code}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-red-400" style={{ width: `${(row.count / failures) * 100}%` }} />
                  </span>
                  <span className="tabular-nums font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="ai-usage" className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 id="ai-usage" className="text-sm font-semibold text-slate-900">Lượt AI đã dùng trong 24 giờ</h3>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th scope="col" className="pb-2 font-medium">Loại</th>
                <th scope="col" className="pb-2 text-right font-medium">Thành công</th>
                <th scope="col" className="pb-2 text-right font-medium">Thất bại</th>
                <th scope="col" className="pb-2 text-right font-medium">Lượt đã trừ</th>
              </tr>
            </thead>
            <tbody>
              {overview.usage.map((row) => (
                <tr key={row.kind} className="border-t border-slate-100">
                  <th scope="row" className="py-2 text-left font-normal text-slate-700">{aiUsageKindLabels[row.kind]}</th>
                  <td className="py-2 text-right tabular-nums">{row.succeeded}</td>
                  <td className={`py-2 text-right tabular-nums ${row.failed ? "text-red-600" : ""}`}>{row.failed}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{row.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
