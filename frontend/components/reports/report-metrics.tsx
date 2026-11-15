import type { OperationalReport } from "@/types/reports";
import { ReportChange } from "./report-change";
import {
  formatReportDuration,
  formatReportPercent,
} from "@/lib/reports/report-format";

export function ReportMetrics({ report }: { report: OperationalReport }) {
  const metrics = [
    {
      id: "uploads",
      label: "Hợp đồng tải lên",
      value: report.uploadedContracts.toLocaleString("vi-VN"),
      detail: "Hợp đồng mới được tạo trong kỳ",
      formula: "Đếm hợp đồng theo ngày tạo; mỗi hợp đồng tính một lần.",
    },
    {
      id: "success",
      label: "Rà soát thành công",
      value: formatReportPercent(report.reviews.successRate),
      detail: `${report.reviews.completed} thành công / ${report.reviews.finished} lượt đã kết thúc`,
      formula:
        "Thành công ÷ (Thành công + Thất bại) × 100%. Không tính lượt đang chạy, đang chờ hoặc đã hủy.",
    },
    {
      id: "risk",
      label: "Tỷ lệ rủi ro cao",
      value: formatReportPercent(report.risks.highRiskRate),
      detail: `${report.risks.high} / ${report.risks.assessedContracts} hợp đồng có kết quả`,
      formula:
        "Hợp đồng rủi ro cao ÷ hợp đồng có kết quả hợp lệ × 100%. Mỗi hợp đồng lấy kết quả thành công mới nhất trong kỳ.",
    },
    {
      id: "duration",
      label: "Xử lý trung bình",
      value: formatReportDuration(report.reviews.averageDurationMs),
      detail: `${report.reviews.timedReviews} lượt có mốc thời gian hợp lệ`,
      formula:
        "Tổng (thời điểm kết thúc − bắt đầu) ÷ số lượt thành công có thời gian hợp lệ. Không cộng thời gian chờ hàng đợi.",
    },
    {
      id: "units",
      label: "Lượt rà soát đã dùng",
      value: report.consumedUnits.analysis.toLocaleString("vi-VN"),
      detail: "1 lượt / 5 trang; làm tròn lên mỗi yêu cầu",
      formula:
        "Tổng đơn vị đã chốt thành công trong sổ hạn mức. File 6 trang tính 2 lượt; yêu cầu thất bại không tính lượt đã dùng.",
    },
    ...(report.payments
      ? [
          {
            id: "payments",
            label: "Thanh toán đã nhận",
            value: report.payments.amount.toLocaleString("vi-VN") + " đ",
            detail: `${report.payments.count} giao dịch · ${report.payments.unfulfilled} chờ kích hoạt`,
            formula:
              "Tổng số tiền VND của giao dịch đã xác nhận thanh toán theo ngày thanh toán. Bao gồm đơn đã nhận tiền nhưng còn chờ kích hoạt.",
          },
        ]
      : []),
  ];
  return (
    <section
      aria-label="Chỉ số báo cáo"
      className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {metrics.map((metric) => (
        <article
          key={metric.id}
          data-report-metric={metric.id}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-medium text-slate-600">{metric.label}</h2>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
            {metric.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {metric.detail}
          </p>
          {report.comparison?.mode !== "none" && (
            <ReportChange change={report.comparison?.changes[metric.id]} />
          )}
          <details className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-blue-700">
              Cách tính
            </summary>
            <p className="mt-2 leading-5">{metric.formula}</p>
          </details>
        </article>
      ))}
    </section>
  );
}
