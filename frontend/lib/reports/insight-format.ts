import type { DashboardInsights } from "@/types/dashboard-insights";
import { dashboardInsightConfig } from "@/config/dashboard-insights";
import { permissions } from "@/config/permissions";
import { roleReportConfig } from "@/config/report-profiles";
import { formatReportDuration } from "./report-format";
import {
  formatCsvDate,
  formatCsvDateTime,
  serializeReportCsv,
} from "./csv-format";

export function insightLabel(
  labels: Record<string, string>,
  row: DashboardInsights["distribution"][number],
) {
  return (
    row.label ?? (Object.hasOwn(labels, row.key) ? labels[row.key] : row.key)
  );
}

export function formatInsight(
  value: number | null | undefined,
  format?: string,
) {
  if (value == null) return "—";
  if (format === "duration") return formatReportDuration(value);
  if (format === "money") return `${value.toLocaleString("vi-VN")} đ`;
  if (format === "percent")
    return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString("vi-VN");
}

export function insightCsv(data: DashboardInsights) {
  if (!permissions.reportExport(data.role))
    throw new Error("Vai trò này không có quyền xuất báo cáo.");
  const config = dashboardInsightConfig[data.role];
  const scopeLabels = {
    system: "Toàn hệ thống",
    organization: "Tổ chức",
    personal: "Cá nhân",
    expert: "Công việc chuyên gia",
  };
  const rows: (string | number | null)[][] = [
    [roleReportConfig[data.role].title],
    ["Phạm vi", scopeLabels[data.scope.type]],
    ["Múi giờ", data.timezone],
    ["Từ ngày", formatCsvDate(data.period.startDate)],
    ["Đến ngày", formatCsvDate(data.period.endDate)],
    [
      "Mốc kết thúc (không bao gồm)",
      formatCsvDateTime(data.period.toExclusive, data.timezone),
    ],
    ["Cập nhật lúc", formatCsvDateTime(data.computedAt, data.timezone)],
    [],
    ["Chỉ số", "Giá trị", "Phạm vi thời gian"],
    ...config.metrics.map((metric) => [
      metric.label,
      data.metrics[metric.key] == null
        ? "Chưa có dữ liệu"
        : metric.format
          ? formatInsight(data.metrics[metric.key], metric.format)
          : data.metrics[metric.key],
      metric.current ? "Hiện tại" : "Trong kỳ",
    ]),
    ...(["user", "staff"].includes(data.role)
      ? [
          ["Lượt hạn mức rà soát", data.metrics.analysisUnits ?? 0, "Trong kỳ"],
          ["Lượt hạn mức chat", data.metrics.chatUnits ?? 0, "Trong kỳ"],
          [
            "Lượt hạn mức soạn hợp đồng",
            data.metrics.draftingUnits ?? 0,
            "Trong kỳ",
          ],
        ]
      : []),
    [],
    ["Ngày / nhóm", ...config.series.map((series) => series.label)],
    ...data.trend.map((row) => [
      formatCsvDate(row.date),
      ...config.series.map((series) => row[series.key] ?? null),
    ]),
    [],
    [config.distributionTitle, "Số lượng"],
    ...data.distribution.map((row) => [
      insightLabel(config.labels, row),
      row.value,
    ]),
  ];
  return serializeReportCsv(rows);
}
