import { reportSeriesKeys, reportValueColumns } from "./report-columns";
import type { OperationalReport } from "@/types/reports";

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

function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+@\-\t\r]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function reportCsv(report: OperationalReport) {
  const rows: (string | number)[][] = [
    ["Báo cáo LawScan", report.scope.organizationId ?? "Toàn hệ thống"],
    ["Múi giờ", report.timezone],
    ["Từ ngày", report.period.startDate],
    ["Đến ngày", report.period.endDate],
    ["Mốc bắt đầu", report.period.from],
    ["Mốc kết thúc (không bao gồm)", report.period.toExclusive],
    ["Thời điểm tính báo cáo", report.computedAt],
    ["Hợp đồng tải lên", report.uploadedContracts],
    ["Lượt rà soát thành công", report.reviews.completed],
    ["Lượt rà soát thất bại", report.reviews.failed],
    ["Lượt đã hủy", report.reviews.cancelled],
    ["Tỷ lệ thành công", formatReportPercent(report.reviews.successRate)],
    ["Hợp đồng có kết quả rủi ro hợp lệ", report.risks.assessedContracts],
    ["Hợp đồng rủi ro cao", report.risks.high],
    ["Tỷ lệ rủi ro cao", formatReportPercent(report.risks.highRiskRate)],
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
    ...(report.payments
      ? [
          ["Thanh toán đã nhận (VND)", report.payments.amount],
          ["Giao dịch đã thanh toán", report.payments.count],
        ]
      : []),
    [],
    ["Ngày", "Rà soát thành công", "Rà soát thất bại"],
    ...report.daily.map((row) => [row.date, row.completed, row.failed]),
    [],
    ["Không gian", "Thành công", "Thất bại", "Tổng lượt rà soát"],
    ...report.usage.map((row) => [
      row.name,
      row.completed,
      row.failed,
      row.total,
    ]),
  ];
  if (report.comparison?.period) {
    rows.push(
      [],
      ["Kỳ so sánh", report.comparison.mode],
      ["Bắt đầu kỳ so sánh", report.comparison.period.startDate],
      ["Kết thúc kỳ so sánh (không gồm)", report.comparison.period.toExclusive],
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
      duration: "Xử lý trung bình (ms)",
      units: "Lượt rà soát đã dùng",
      chat: "Chat",
      drafting: "Soạn AI",
      payments: "Tiền đã nhận (VND)",
    };
    for (const [key, change] of Object.entries(report.comparison.changes)) {
      rows.push([
        labels[key] ?? key,
        change.current ?? "",
        change.previous ?? "",
        change.difference ?? "",
        change.changePercent ?? "",
        change.unit === "percentage_points" ? "Điểm phần trăm" : "%",
        change.status,
      ]);
    }
  }
  if (report.trend) {
    rows.push(
      [],
      ["Gộp theo", report.trend.granularity],
      [
        "Nhóm",
        "Kỳ",
        "Ngày nhóm",
        ...reportValueColumns.map((column) => column.label),
        "Xử lý TB (ms)",
      ],
    );
    for (const bucket of report.trend.buckets) {
      for (const side of ["current", "previous"] as const) {
        if (side === "previous" && !report.comparison?.period) continue;
        const value = bucket[side];
        rows.push([
          bucket.index,
          side === "current" ? "Kỳ này" : "So sánh",
          value?.date ?? "",
          ...reportSeriesKeys.map((key) => value?.[key] ?? ""),
        ]);
      }
    }
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
