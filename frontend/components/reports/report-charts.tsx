"use client";

import dynamic from "next/dynamic";
import { reportSeriesKeys } from "@/lib/reports/report-columns";
import type { OperationalReport, ReportMetricChange } from "@/types/reports";
import {
  formatReportDuration,
  formatReportPercent,
} from "@/lib/reports/report-format";
import { ReportDetailTable } from "./report-detail-table";
import { ReportRiskDistribution } from "./report-risk-distribution";
import type { ReportChartSeries } from "./report-series-chart";
import { ChartLoading } from "./chart-loading";
import { operationalReportFeatures } from "@/config/report-profiles";
import styles from "./reports.module.css";

const ReportSeriesChart = dynamic(
  () =>
    import("./report-series-chart").then((module) => module.ReportSeriesChart),
  { ssr: false, loading: () => <ChartLoading /> },
);

// Validated categorical slots (light surface): adjacent pairs clear CVD ΔE ≥ 8.
const BLUE = "#2a78d6";
const reviewKinds: ReportChartSeries[] = [
  { key: "completed", label: "Thành công", color: BLUE },
  { key: "failed", label: "Thất bại", color: "#e34948" },
  { key: "cancelled", label: "Đã hủy", color: "#eda100" },
];
const usageKinds: ReportChartSeries[] = [
  { key: "analysis", label: "Rà soát", color: BLUE },
  { key: "chat", label: "Chat", color: "#1baf7a" },
  { key: "drafting", label: "Soạn AI", color: "#6250d6" },
];

const formatCount = (value: number) => value.toLocaleString("vi-VN");
const formatMoney = (value: number) =>
  `${value.toLocaleString("vi-VN", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  })} đ`;
const formatShare = (value: number) =>
  `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

/** Sums several comparable changes into one (used for total AI usage). */
function combinedChange(
  changes: (ReportMetricChange | undefined)[],
): ReportMetricChange | undefined {
  if (changes.some((change) => !change || change.previous === null))
    return undefined;
  const current = changes.reduce(
    (sum, change) => sum + (change?.current ?? 0),
    0,
  );
  const previous = changes.reduce(
    (sum, change) => sum + (change?.previous ?? 0),
    0,
  );
  return {
    current,
    previous,
    difference: current - previous,
    changePercent: previous ? ((current - previous) / previous) * 100 : null,
    unit: "percent",
    status: previous ? "comparable" : "no_baseline",
  };
}

function WorkspaceRanking({ report }: { report: OperationalReport }) {
  const max = Math.max(1, ...report.usage.map((item) => item.total));
  const total = report.usage.reduce((sum, item) => sum + item.total, 0);
  return (
    <section className={`${styles.panel} ${styles.chart} xl:col-span-2`}>
      <div className={styles.chartHeader}>
        <div className="min-w-0">
          <h3 className={styles.chartTitle}>
            10 không gian có nhiều lượt rà soát nhất
          </h3>
          <p className={styles.chartDescription}>
            Theo tổng lượt thành công và thất bại trong kỳ này.
          </p>
        </div>
        {report.usage.length > 0 && (
          <ul className={styles.chartLegend} aria-label="Chú giải">
            {reviewKinds.slice(0, 2).map((kind) => (
              <li key={kind.key}>
                <span
                  aria-hidden="true"
                  className={styles.legendDot}
                  style={{ background: kind.color }}
                />
                {kind.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!report.usage.length && (
        <p className="py-10 text-sm text-slate-500">Chưa có dữ liệu</p>
      )}
      <ol className="mt-3 divide-y divide-slate-100">
        {report.usage.map((row, index) => (
          <li key={row.id} className={`${styles.rankRow} text-sm`}>
            <span className={styles.rankNumber} data-top={index < 3}>
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className="truncate text-xs font-medium text-slate-700"
                  title={row.name}
                >
                  {row.name}
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                  {formatCount(row.completed)} thành công ·{" "}
                  {formatCount(row.failed)} thất bại
                </span>
              </div>
              <div
                className={styles.rankTrack}
                role="img"
                aria-label={`${row.completed} thành công, ${row.failed} thất bại`}
                style={{ width: `${(row.total / max) * 100}%` }}
              >
                {row.completed > 0 && (
                  <span
                    style={{
                      flexGrow: row.completed,
                      background: reviewKinds[0].color,
                    }}
                  />
                )}
                {row.failed > 0 && (
                  <span
                    style={{
                      flexGrow: row.failed,
                      background: reviewKinds[1].color,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="text-right">
              <strong className="block text-base font-semibold tabular-nums text-slate-800">
                {formatCount(row.total)}
              </strong>
              <span className="text-[10px] tabular-nums text-slate-400">
                {total ? formatShare((row.total / total) * 100) : "—"}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReportCharts({ report }: { report: OperationalReport }) {
  const features = operationalReportFeatures(report.role);
  const compare = !!report.comparison?.period;
  const changes = report.comparison?.changes ?? {};
  const granularity = report.trend?.granularity ?? "day";
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
  const single = (key: string, label: string): ReportChartSeries[] => [
    { key, label, color: BLUE },
  ];
  const interval = { day: "ngày", week: "tuần", month: "tháng" }[granularity];
  const description = compare
    ? `Gộp theo ${interval}; kỳ so sánh được ghép theo thứ tự nhóm trong kỳ.`
    : `Gộp theo ${interval}.`;
  const shared = { rows, compare, granularity };
  const units = report.consumedUnits;
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <ReportSeriesChart
        {...shared}
        title="Hợp đồng tải lên"
        chartType="line"
        description={description}
        series={single("uploads", "Hợp đồng tải lên")}
        unit="hợp đồng"
        summary={{
          value: formatCount(report.uploadedContracts),
          caption: "hợp đồng trong kỳ",
          change: changes.uploads,
        }}
      />
      <ReportSeriesChart
        {...shared}
        title="Kết quả rà soát"
        description={description}
        series={reviewKinds}
        unit="lượt"
        summary={{
          value: formatReportPercent(report.reviews.successRate),
          caption: `thành công · ${formatCount(report.reviews.finished)} lượt kết thúc`,
          change: changes.success,
        }}
      />
      {features.payments && report.payments && (
        <ReportSeriesChart
          {...shared}
          title="Thanh toán đã nhận"
          description="Tiền VND đã được xác nhận, theo ngày thanh toán; không phải lợi nhuận."
          series={single("receivedAmount", "Thanh toán đã nhận")}
          formatValue={formatMoney}
          summary={{
            value: `${report.payments.amount.toLocaleString("vi-VN")} đ`,
            caption: `${formatCount(report.payments.count)} giao dịch`,
            change: changes.payments,
          }}
        />
      )}
      <ReportSeriesChart
        {...shared}
        title="Hạn mức AI đã sử dụng"
        description={description}
        series={usageKinds}
        unit="lượt"
        summary={{
          value: formatCount(units.analysis + units.chat + units.drafting),
          caption: "lượt đã dùng",
          change: combinedChange([
            changes.units,
            changes.chat,
            changes.drafting,
          ]),
          goodDirection: "neutral",
        }}
      />
      <ReportSeriesChart
        {...shared}
        title="Thời gian xử lý trung bình"
        wide={!features.issues}
        chartType="line"
        description="Trung bình có trọng số theo số lượt có thời gian hợp lệ; không gồm thời gian chờ."
        series={single("averageDurationMs", "Thời gian xử lý")}
        formatValue={formatReportDuration}
        summary={{
          value: formatReportDuration(report.reviews.averageDurationMs),
          caption: `trung bình · ${formatCount(report.reviews.timedReviews)} lượt`,
          change: changes.duration,
          goodDirection: "down",
        }}
      />
      {features.issues && <ReportRiskDistribution report={report} />}
      {features.workspaceRanking && <WorkspaceRanking report={report} />}
      <ReportDetailTable report={report} />
    </div>
  );
}
