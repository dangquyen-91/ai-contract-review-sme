import type { OperationalReport } from "@/types/reports";
import { visibleReportColumns } from "./report-columns";
import {
  operationalReportFeatures,
  roleReportConfig,
} from "@/config/report-profiles";
import {
  createExcelWorkbook,
  excelDate,
  excelFormats,
  excelMetric,
  writeExcelMetadata,
  writeExcelTable,
} from "./excel-workbook";
import type { ExcelKind, ExportCell } from "./excel-workbook";

export function reportExcel(report: OperationalReport) {
  const features = operationalReportFeatures(report.role);
  const workbook = createExcelWorkbook(
    roleReportConfig[report.role].title,
    report.period.startDate,
    report.period.endDate,
    report.timezone,
  );
  writeExcelMetadata(workbook, {
    scope: report.scope.organizationId
      ? (report.organizations.find(
          (org) => org.id === report.scope.organizationId,
        )?.name ?? "Tổ chức của bạn")
      : "Toàn hệ thống",
    timezone: report.timezone,
    start: report.period.startDate,
    end: report.period.endDate,
    computedAt: report.computedAt,
    toExclusive: report.period.toExclusive,
  });
  type Metric = {
    key: string;
    label: string;
    value: number | null;
    format?: "percent" | "money" | "duration";
  };
  const metrics = (
    [
      {
        key: "uploads",
        label: "Hợp đồng tải lên",
        value: report.uploadedContracts,
      },
      {
        key: "completed",
        label: "Rà soát thành công",
        value: report.reviews.completed,
      },
      {
        key: "failed",
        label: "Rà soát thất bại",
        value: report.reviews.failed,
      },
      {
        key: "cancelled",
        label: "Lượt đã hủy",
        value: report.reviews.cancelled,
      },
      {
        key: "success",
        label: "Tỷ lệ thành công",
        value: report.reviews.successRate,
        format: "percent",
      },
      {
        key: "violations",
        label: "Tỷ lệ hợp đồng có vi phạm",
        value: report.issues.violationRate,
        format: "percent",
      },
      {
        key: "duration",
        label: "Thời gian xử lý trung bình",
        value: report.reviews.averageDurationMs,
        format: "duration",
      },
      {
        key: "units",
        label: "Đơn vị rà soát đã dùng",
        value: report.consumedUnits.analysis,
      },
      {
        key: "chat",
        label: "Lượt chat đã dùng",
        value: report.consumedUnits.chat,
      },
      {
        key: "drafting",
        label: "Lượt soạn AI đã dùng",
        value: report.consumedUnits.drafting,
      },
      ...(features.payments && report.payments
        ? [
            {
              key: "payments",
              label: "Thanh toán đã nhận",
              value: report.payments.amount,
              format: "money" as const,
            },
          ]
        : []),
    ] satisfies Metric[]
  ).filter((metric) => features.issues || metric.key !== "violations");
  const summary = workbook.getWorksheet("Tổng quan")!;
  writeExcelTable(
    summary,
    "LawScanReportMetrics",
    13,
    [{ label: "Chỉ số" }, { label: "Giá trị" }],
    metrics.map((metric) => [
      metric.label,
      excelMetric(metric.value, metric.format),
    ]),
  );
  metrics.forEach((metric, index) => {
    summary.getCell(index + 14, 2).numFmt =
      excelFormats[metric.format ?? "count"];
  });
  const trend = workbook.getWorksheet("Xu hướng")!;
  const columns = visibleReportColumns(report);
  const trendRows: ExportCell[][] = [];
  for (const bucket of report.trend?.buckets ?? []) {
    for (const side of ["current", "previous"] as const) {
      if (side === "previous" && !report.comparison?.period) continue;
      const value = bucket[side];
      trendRows.push([
        bucket.index,
        side === "current" ? "Kỳ này" : "So sánh",
        value ? excelDate(value.date) : "Chưa có dữ liệu",
        ...columns.map((column) => excelMetric(value?.[column.key])),
        excelMetric(value?.averageDurationMs, "duration"),
      ]);
    }
  }
  // Older API responses still have a useful daily series.
  if (!report.trend)
    for (const row of report.daily)
      trendRows.push([
        trendRows.length + 1,
        "Kỳ này",
        excelDate(row.date),
        ...columns.map((column) =>
          column.key === "completed"
            ? row.completed
            : column.key === "failed"
              ? row.failed
              : "Chưa có dữ liệu",
        ),
        "Chưa có dữ liệu",
      ]);
  writeExcelTable(
    trend,
    "LawScanReportTrend",
    5,
    [
      { label: "Nhóm", kind: "count", width: 10 },
      { label: "Kỳ", width: 18 },
      { label: "Ngày nhóm", kind: "date", width: 18 },
      ...columns.map((column) => ({
        label: column.label,
        kind: (column.key === "receivedAmount"
          ? "money"
          : "count") as ExcelKind,
        width: 22,
      })),
      { label: "Thời gian xử lý trung bình", kind: "duration", width: 28 },
    ],
    trendRows,
  );
  trend.views = [
    { state: "frozen", ySplit: 5, xSplit: 3, showGridLines: false },
  ];
  const details = workbook.getWorksheet("Chi tiết")!;
  const issueLabels = {
    withViolations: "Có vi phạm",
    withIssues: "Có vấn đề khác",
    noIssues: "Không phát hiện vấn đề",
  };
  let next = features.issues
    ? writeExcelTable(
        details,
        "LawScanIssues",
        5,
        [
          { label: "Kết quả rà soát", width: 48 },
          { label: "Số hợp đồng", kind: "count" },
        ],
        Object.entries(issueLabels).map(([key, label]) => [
          label,
          report.issues[key as keyof typeof issueLabels],
        ]),
      )
    : 5;
  if (report.comparison?.period) {
    details.getCell(next, 1).value =
      `So sánh ${report.comparison.mode === "year" ? "cùng kỳ năm trước" : "kỳ trước"}`;
    const comparisonStart = next + 5;
    details.getCell(next + 1, 1).value = "Từ ngày";
    details.getCell(next + 1, 2).value = excelDate(
      report.comparison.period.startDate,
    );
    details.getCell(next + 1, 2).numFmt = excelFormats.date;
    details.getCell(next + 2, 1).value = "Mốc kết thúc (không bao gồm)";
    details.getCell(next + 2, 2).value = excelDate(
      report.comparison.period.toExclusive,
      report.timezone,
    );
    details.getCell(next + 2, 2).numFmt = excelFormats.dateTime;
    const compared = metrics.filter(
      (metric) => report.comparison?.changes[metric.key],
    );
    next = writeExcelTable(
      details,
      "LawScanComparison",
      comparisonStart,
      [
        { label: "Chỉ số", width: 48 },
        { label: "Kỳ này" },
        { label: "Kỳ so sánh" },
        { label: "Chênh lệch" },
        { label: "Tăng / giảm", kind: "percent" },
        { label: "Trạng thái", width: 28 },
      ],
      compared.map((metric) => {
        const change = report.comparison!.changes[metric.key];
        return [
          metric.label,
          excelMetric(change.current, metric.format),
          excelMetric(change.previous, metric.format),
          excelMetric(
            change.difference,
            change.unit === "percentage_points" ? undefined : metric.format,
          ),
          excelMetric(change.changePercent, "percent"),
          {
            comparable: "Có thể so sánh",
            no_data: "Chưa có dữ liệu",
            no_baseline: "Không có mốc so sánh",
          }[change.status],
        ];
      }),
    );
    compared.forEach((metric, index) => {
      const row = details.getRow(comparisonStart + index + 1);
      row.getCell(2).numFmt = row.getCell(3).numFmt =
        excelFormats[metric.format ?? "count"];
      row.getCell(4).numFmt =
        report.comparison!.changes[metric.key].unit === "percentage_points"
          ? excelFormats.points
          : excelFormats[metric.format ?? "count"];
    });
  }
  if (features.workspaceRanking)
    writeExcelTable(
      details,
      "LawScanWorkspaceUsage",
      next,
      [
        { label: "Không gian", width: 48 },
        { label: "Thành công", kind: "count" },
        { label: "Thất bại", kind: "count" },
        { label: "Tổng lượt rà soát", kind: "count" },
      ],
      report.usage.map((row) => [
        row.name,
        row.completed,
        row.failed,
        row.total,
      ]),
    );
  return workbook;
}
