import { reportSeriesKeys } from "@/lib/reports/report-columns";
import type { OperationalReport } from "@/types/reports";
import { formatReportDuration } from "@/lib/reports/report-format";
import { ReportDetailTable } from "./report-detail-table";
import { ReportRiskDistribution } from "./report-risk-distribution";
import {
  ReportSeriesChart,
  type ReportChartSeries,
} from "./report-series-chart";

const kinds = [
  {
    key: "completed",
    label: "Thành công",
    color: "#2563eb",
    previous: "#93c5fd",
  },
  { key: "failed", label: "Thất bại", color: "#e11d48", previous: "#fda4af" },
  { key: "cancelled", label: "Đã hủy", color: "#64748b", previous: "#cbd5e1" },
] as const;
const usageKinds = [
  { key: "analysis", label: "Rà soát", color: "#2563eb", previous: "#93c5fd" },
  { key: "chat", label: "Chat", color: "#059669", previous: "#6ee7b7" },
  { key: "drafting", label: "Soạn AI", color: "#7c3aed", previous: "#c4b5fd" },
] as const;

export function ReportCharts({ report }: { report: OperationalReport }) {
  const compare = !!report.comparison?.period;
  const buckets = report.trend?.buckets ?? [];
  const rows = buckets.map((bucket) => {
    const result: { label: string; [key: string]: string | number | null } = {
      label: bucket.label,
      currentDate: bucket.current?.date ?? null,
      previousDate: bucket.previous?.date ?? null,
    };
    for (const key of reportSeriesKeys) {
      result[key] = bucket.current?.[key] ?? null;
      result[`previous_${key}`] = bucket.previous?.[key] ?? null;
    }
    return result;
  });
  const groupedSeries = (
    items: readonly {
      key: string;
      label: string;
      color: string;
      previous: string;
    }[],
  ): ReportChartSeries[] =>
    items.flatMap((item) => [
      {
        key: item.key,
        label: `${item.label} · kỳ này`,
        color: item.color,
        stack: "current",
      },
      ...(compare
        ? [
            {
              key: `previous_${item.key}`,
              label: `${item.label} · so sánh`,
              color: item.previous,
              stack: "previous",
            },
          ]
        : []),
    ]);
  const pair = (key: string): ReportChartSeries[] => [
    { key, label: "Kỳ này", color: "#2563eb" },
    ...(compare
      ? [{ key: `previous_${key}`, label: "Kỳ so sánh", color: "#a5b4fc" }]
      : []),
  ];
  const interval = { day: "ngày", week: "tuần", month: "tháng" }[
    report.trend?.granularity ?? "day"
  ];
  const description = `Gộp theo ${interval}. Các cột so sánh được ghép theo thứ tự nhóm trong kỳ.`;
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <ReportSeriesChart
        title="Hợp đồng tải lên"
        description={description}
        rows={rows}
        series={pair("uploads")}
        unit="hợp đồng"
      />
      <ReportSeriesChart
        title="Kết quả rà soát"
        description={description}
        rows={rows}
        series={groupedSeries(kinds)}
        unit="lượt"
      />
      {report.payments && (
        <ReportSeriesChart
          title="Thanh toán đã nhận"
          description="Tiền VND đã được xác nhận, theo ngày thanh toán; không phải lợi nhuận."
          rows={rows}
          series={pair("receivedAmount")}
          unit="đ"
        />
      )}
      <ReportSeriesChart
        title="Hạn mức AI đã sử dụng"
        description={description}
        rows={rows}
        series={groupedSeries(usageKinds)}
        unit="lượt"
      />
      <ReportSeriesChart
        title="Thời gian xử lý trung bình"
        description="Trung bình có trọng số theo số lượt có thời gian hợp lệ; không gồm thời gian chờ."
        rows={rows}
        series={pair("averageDurationMs")}
        formatValue={formatReportDuration}
      />
      <ReportRiskDistribution report={report} />
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
        <h2 className="font-semibold">
          10 không gian có nhiều lượt rà soát nhất
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Theo tổng lượt thành công và thất bại trong kỳ này.
        </p>
        {!report.usage.length && (
          <p className="py-10 text-sm text-slate-500">Chưa có dữ liệu</p>
        )}
        <ol className="mt-4 divide-y divide-slate-100">
          {report.usage.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 justify-between gap-3 py-3 text-sm"
            >
              <span className="truncate" title={row.name}>
                {row.name}
              </span>
              <strong>{row.total}</strong>
            </li>
          ))}
        </ol>
      </section>
      <ReportDetailTable report={report} />
    </div>
  );
}
