import { visibleReportColumns } from "@/lib/reports/report-columns";
import type { OperationalReport, ReportSeries } from "@/types/reports";
import { formatReportDuration } from "@/lib/reports/report-format";
import styles from "./reports.module.css";

export function ReportDetailTable({ report }: { report: OperationalReport }) {
  const columns = visibleReportColumns(report);
  const compare = !!report.comparison?.period;
  const buckets = report.trend?.buckets ?? [];
  return (
    <details className={`${styles.panel} ${styles.table} xl:col-span-2`}>
      <summary>
        Xem bảng số liệu biểu đồ
        <span className="ml-2 text-[10px] font-normal text-slate-400">
          {buckets.length} nhóm dữ liệu
        </span>
      </summary>
      <div className="max-h-96 overflow-auto border-t border-slate-100">
        <table className="w-full min-w-[850px] text-left text-xs">
          <caption className="sr-only">
            Số liệu biểu đồ theo nhóm và kỳ báo cáo
          </caption>
          <thead>
            <tr>
              {[
                "Nhóm",
                "Kỳ",
                "Ngày nhóm",
                ...columns.map((column) => column.label),
                "Xử lý TB",
              ].map((label) => (
                <th key={label} scope="col" className="p-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!buckets.length && (
              <tr>
                <td
                  colSpan={columns.length + 4}
                  className="text-center text-slate-500"
                >
                  Chưa có dữ liệu trong kỳ đã chọn.
                </td>
              </tr>
            )}
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
                    {columns.map(({ key }) => (
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
