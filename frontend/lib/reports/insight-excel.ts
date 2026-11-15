import { dashboardInsightConfig } from "@/config/dashboard-insights";
import { permissions } from "@/config/permissions";
import { roleReportConfig } from "@/config/report-profiles";
import type { DashboardInsights } from "@/types/dashboard-insights";
import { insightLabel } from "./insight-format";
import {
  createExcelWorkbook,
  excelDate,
  excelFormats,
  excelMetric,
  writeExcelMetadata,
  writeExcelTable,
} from "./excel-workbook";
import type { ExportCell } from "./excel-workbook";

export function insightExcel(data: DashboardInsights) {
  if (!permissions.reportExport(data.role))
    throw new Error("Vai trò này không có quyền xuất báo cáo.");
  const config = dashboardInsightConfig[data.role];
  const workbook = createExcelWorkbook(
    roleReportConfig[data.role].title,
    data.period.startDate,
    data.period.endDate,
    data.timezone,
  );
  writeExcelMetadata(workbook, {
    scope: {
      system: "Toàn hệ thống",
      organization: "Tổ chức",
      personal: "Cá nhân",
      expert: "Công việc chuyên gia",
    }[data.scope.type],
    timezone: data.timezone,
    start: data.period.startDate,
    end: data.period.endDate,
    computedAt: data.computedAt,
    toExclusive: data.period.toExclusive,
  });
  const summary = workbook.getWorksheet("Tổng quan")!;
  const metrics = [
    ...config.metrics,
    ...(data.role === "user"
      ? [
          { key: "analysisUnits", label: "Lượt hạn mức rà soát" },
          { key: "chatUnits", label: "Lượt hạn mức chat" },
          { key: "draftingUnits", label: "Lượt hạn mức soạn hợp đồng" },
        ]
      : []),
  ];
  writeExcelTable(
    summary,
    "LawScanMetrics",
    13,
    [{ label: "Chỉ số" }, { label: "Giá trị" }, { label: "Phạm vi thời gian" }],
    metrics.map((metric) => [
      metric.label,
      excelMetric(
        data.metrics[metric.key] ?? (metric.key.endsWith("Units") ? 0 : null),
        "format" in metric ? metric.format : undefined,
      ),
      "current" in metric && metric.current ? "Hiện tại" : "Trong kỳ",
    ]),
  );
  metrics.forEach((metric, index) => {
    const format = "format" in metric ? metric.format : undefined;
    summary.getCell(index + 14, 2).numFmt = format
      ? excelFormats[format]
      : excelFormats.count;
  });
  const trend = workbook.getWorksheet("Xu hướng")!;
  writeExcelTable(
    trend,
    "LawScanTrend",
    5,
    [
      {
        label: "Ngày / nhóm",
        kind: data.trend[0]?.date.length === 7 ? "month" : "date",
        width: 20,
      },
      ...config.series.map((series) => ({
        label: series.label,
        kind: "count" as const,
        width: 28,
      })),
    ],
    data.trend.map((row) => [
      excelDate(row.date),
      ...config.series.map((series) =>
        typeof row[series.key] === "number"
          ? (row[series.key] as number)
          : "Chưa có dữ liệu",
      ),
    ]),
  );
  trend.views = [
    { state: "frozen", ySplit: 5, xSplit: 1, showGridLines: false },
  ];
  const details = workbook.getWorksheet("Chi tiết")!;
  details.getCell("A4").value = config.distributionTitle;
  const rows: ExportCell[][] = data.distribution.map((row) => [
    insightLabel(config.labels, row),
    row.value,
  ]);
  const next = writeExcelTable(
    details,
    "LawScanDistribution",
    6,
    [
      { label: config.distributionTitle, width: 54 },
      { label: "Số lượng", kind: "count" },
    ],
    rows,
  );
  details.getCell(next, 1).value = config.distributionNote;
  details.getCell(next, 1).font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: { argb: "FF64748B" },
  };
  return workbook;
}
