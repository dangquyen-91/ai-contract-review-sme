import { visibleReportColumns } from "./report-columns";
import {
  operationalReportFeatures,
  roleReportConfig,
} from "@/config/report-profiles";
import type { OperationalReport } from "@/types/reports";
import {
  formatCsvDate,
  formatCsvDateTime,
  formatCsvMoney,
  serializeReportCsv,
} from "./csv-format";

export function formatReportPercent(value: number | null) {
  return value === null
    ? "Chưa có dữ liệu"
    : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function formatReportDuration(milliseconds: number | null) {
  if (milliseconds === null) return "Chưa có dữ liệu";
  const seconds = milliseconds / 1000;
  return seconds < 60
    ? `${seconds.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây`
    : `${(seconds / 60).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} phút`;
}

export function reportCsv(report: OperationalReport) {
  const features = operationalReportFeatures(report.role);
  const columns = visibleReportColumns(report);
  const dateTime = (value: string) => formatCsvDateTime(value, report.timezone);
  const metricValue = (key: string, value: number | null) => {
    if (value == null) return "Chưa có dữ liệu";
    if (key === "duration") return formatReportDuration(value);
    if (key === "success" || key === "risk") return formatReportPercent(value);
    if (key === "payments") return formatCsvMoney(value);
    return value;
  };
  const scopeName = report.scope.organizationId
    ? (report.organizations.find(
        (organization) => organization.id === report.scope.organizationId,
      )?.name ?? "Tổ chức của bạn")
    : "Toàn hệ thống";
  const rows: (string | number)[][] = [
    [roleReportConfig[report.role].title, scopeName],
    ["Múi giờ", report.timezone],
    ["Từ ngày", formatCsvDate(report.period.startDate)],
    ["Đến ngày", formatCsvDate(report.period.endDate)],
    ["Mốc bắt đầu", dateTime(report.period.from)],
    ["Mốc kết thúc (không bao gồm)", dateTime(report.period.toExclusive)],
    ["Thời điểm tính báo cáo", dateTime(report.computedAt)],
    ["Hợp đồng tải lên", report.uploadedContracts],
    ["Lượt rà soát thành công", report.reviews.completed],
    ["Lượt rà soát thất bại", report.reviews.failed],
    ["Lượt đã hủy", report.reviews.cancelled],
    ["Tỷ lệ thành công", formatReportPercent(report.reviews.successRate)],
    ...(features.risks
      ? [
          ["Hợp đồng có kết quả rủi ro hợp lệ", report.risks.assessedContracts],
          ["Hợp đồng rủi ro cao", report.risks.high],
          ["Tỷ lệ rủi ro cao", formatReportPercent(report.risks.highRiskRate)],
        ]
      : []),
    [
      "Thời gian xử lý trung bình",
      formatReportDuration(report.reviews.averageDurationMs),
    ],
    ["Số lượt có thời gian hợp lệ", report.reviews.timedReviews],
    [
      "Đơn vị rà soát đã dùng (1 đơn vị / 5 trang)",
      report.consumedUnits.analysis,
    ],
    ["Lượt chat đã dùng", report.consumedUnits.chat],
    ["Lượt soạn AI đã dùng", report.consumedUnits.drafting],
    ...(features.payments && report.payments
      ? [
          ["Thanh toán đã nhận (VND)", formatCsvMoney(report.payments.amount)],
          ["Giao dịch đã thanh toán", report.payments.count],
        ]
      : []),
    [],
    ["Ngày", "Rà soát thành công", "Rà soát thất bại"],
    ...report.daily.map((row) => [
      formatCsvDate(row.date),
      row.completed,
      row.failed,
    ]),
    ...(features.workspaceRanking
      ? [
          [],
          ["Không gian", "Thành công", "Thất bại", "Tổng lượt rà soát"],
          ...report.usage.map((row) => [
            row.name,
            row.completed,
            row.failed,
            row.total,
          ]),
        ]
      : []),
  ];
  if (report.comparison?.period) {
    rows.push(
      [],
      [
        "Kỳ so sánh",
        report.comparison.mode === "year" ? "Cùng kỳ năm trước" : "Kỳ trước",
      ],
      ["Bắt đầu kỳ so sánh", formatCsvDate(report.comparison.period.startDate)],
      [
        "Kết thúc kỳ so sánh (không gồm)",
        dateTime(report.comparison.period.toExclusive),
      ],
      [
        "Chỉ số",
        "Kỳ này",
        "Kỳ so sánh",
        "Chênh lệch",
        "Tăng/giảm (%)",
        "Đơn vị so sánh",
        "Trạng thái",
      ],
    );
    const labels: Record<string, string> = {
      uploads: "Hợp đồng tải lên",
      completed: "Rà soát thành công",
      failed: "Rà soát thất bại",
      success: "Tỷ lệ thành công",
      risk: "Tỷ lệ rủi ro cao",
      duration: "Xử lý trung bình",
      units: "Lượt rà soát đã dùng",
      chat: "Chat",
      drafting: "Soạn AI",
      payments: "Tiền đã nhận (VND)",
    };
    for (const [key, change] of Object.entries(report.comparison.changes)) {
      if (
        (key === "risk" && !features.risks) ||
        (key === "payments" && (!features.payments || !report.payments))
      )
        continue;
      rows.push([
        labels[key] ?? key,
        metricValue(key, change.current),
        metricValue(key, change.previous),
        change.difference == null
          ? "Chưa có dữ liệu"
          : change.unit === "percentage_points"
            ? `${change.difference.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} điểm phần trăm`
            : metricValue(key, change.difference),
        formatReportPercent(change.changePercent),
        change.unit === "percentage_points" ? "Điểm phần trăm" : "%",
        {
          comparable: "Có thể so sánh",
          no_data: "Chưa có dữ liệu",
          no_baseline: "Không có mốc so sánh",
        }[change.status],
      ]);
    }
  }
  if (report.trend) {
    rows.push(
      [],
      [
        "Gộp theo",
        { day: "Ngày", week: "Tuần", month: "Tháng" }[report.trend.granularity],
      ],
      [
        "Nhóm",
        "Kỳ",
        "Ngày nhóm",
        ...columns.map((column) => column.label),
        "Thời gian xử lý trung bình",
      ],
    );
    for (const bucket of report.trend.buckets) {
      for (const side of ["current", "previous"] as const) {
        if (side === "previous" && !report.comparison?.period) continue;
        const value = bucket[side];
        rows.push([
          bucket.index,
          side === "current" ? "Kỳ này" : "So sánh",
          value?.date ? formatCsvDate(value.date) : "Chưa có dữ liệu",
          ...columns.map(({ key }) =>
            key === "receivedAmount"
              ? formatCsvMoney(value?.[key] ?? null)
              : (value?.[key] ?? "Chưa có dữ liệu"),
          ),
          formatReportDuration(value?.averageDurationMs ?? null),
        ]);
      }
    }
  }
  return serializeReportCsv(rows);
}
