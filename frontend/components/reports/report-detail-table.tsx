import { reportValueColumns } from "@/lib/reports/report-columns";
import type { OperationalReport, ReportSeries } from "@/types/reports";
import { formatReportDuration } from "@/lib/reports/report-format";

export function ReportDetailTable({ report }: { report: OperationalReport }) {
  const compare = !!report.comparison?.period;
  const buckets = report.trend?.buckets ?? [];
  return (
    <details className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
      <summary className="cursor-pointer font-semibold text-blue-700">
        Xem bảng số liệu biểu đồ
      </summary>
      <div className="mt-4 max-h-96 overflow-auto">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead>
            <tr>
              {[
                "Nhóm",
                "Kỳ",
                "Ngày nhóm",
                ...reportValueColumns.map((column) => column.label),
                "Xử lý TB",
              ].map((label) => (
                <th key={label} className="p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.flatMap((bucket) =>
              (compare ? ["current", "previous"] : ["current"]).map((side) => {
                const item: ReportSeries | null =
                  side === "current" ? bucket.current : bucket.previous;
                return (
                  <tr
                    key={`${bucket.index}-${side}`}
                    className="border-t border-slate-100"
                  >
                    <td className="p-2">{bucket.index}</td>
                    <td>{side === "current" ? "Kỳ này" : "So sánh"}</td>
                    <td>{item?.date ?? "—"}</td>
                    {reportValueColumns.map(({ key }) => (
                      <td key={key}>
                        {item?.[key]?.toLocaleString("vi-VN") ?? "—"}
                      </td>
                    ))}
                    <td>
                      {formatReportDuration(item?.averageDurationMs ?? null)}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}
