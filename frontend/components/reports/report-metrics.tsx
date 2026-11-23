import type { CSSProperties } from "react";
import type { OperationalReport } from "@/types/reports";
import { ReportChange } from "./report-change";
import { operationalReportFeatures } from "@/config/report-profiles";
import {
  FileText,
  CircleCheck,
  ShieldAlert,
  Timer,
  Sparkles,
  Wallet,
} from "lucide-react";
import styles from "./reports.module.css";
import {
  formatReportDuration,
  formatReportPercent,
} from "@/lib/reports/report-format";

export function ReportMetrics({ report }: { report: OperationalReport }) {
  const features = operationalReportFeatures(report.role);
  const metrics = [
    {
      id: "uploads",
      icon: FileText,
      color: "#4479ce",
      label: "Hợp đồng tải lên",
      value: report.uploadedContracts.toLocaleString("vi-VN"),
      detail: "Hợp đồng mới được tạo trong kỳ",
      formula: "Đếm hợp đồng theo ngày tạo; mỗi hợp đồng tính một lần.",
    },
    {
      id: "success",
      icon: CircleCheck,
      color: "#268473",
      label: "Rà soát thành công",
      value: formatReportPercent(report.reviews.successRate),
      detail: `${report.reviews.completed} thành công / ${report.reviews.finished} lượt đã kết thúc`,
      formula:
        "Thành công ÷ (Thành công + Thất bại) × 100%. Không tính lượt đang chạy, đang chờ hoặc đã hủy.",
    },
    {
      id: "violations",
      icon: ShieldAlert,
      color: "#c16b53",
      label: "Tỷ lệ hợp đồng có vi phạm",
      value: formatReportPercent(report.issues.violationRate),
      detail: `${report.issues.withViolations} / ${report.issues.checkedContracts} hợp đồng có kết quả`,
      formula:
        "Hợp đồng có vi phạm ÷ hợp đồng có dữ liệu phân loại vấn đề × 100%. Mỗi hợp đồng lấy lượt rà soát thành công mới nhất có dữ liệu này trong kỳ.",
    },
    {
      id: "duration",
      icon: Timer,
      color: "#6783b3",
      label: "Xử lý trung bình",
      value: formatReportDuration(report.reviews.averageDurationMs),
      detail: `${report.reviews.timedReviews} lượt có mốc thời gian hợp lệ`,
      formula:
        "Tổng (thời điểm kết thúc − bắt đầu) ÷ số lượt thành công có thời gian hợp lệ. Không cộng thời gian chờ hàng đợi.",
    },
    {
      id: "units",
      icon: Sparkles,
      color: "#8b70bc",
      label: "Lượt rà soát đã dùng",
      value: report.consumedUnits.analysis.toLocaleString("vi-VN"),
      detail: "1 lượt / 5 trang; làm tròn lên mỗi yêu cầu",
      formula:
        "Tổng đơn vị đã chốt thành công trong sổ hạn mức. File 6 trang tính 2 lượt; yêu cầu thất bại không tính lượt đã dùng.",
    },
    ...(features.payments && report.payments
      ? [
          {
            id: "payments",
            icon: Wallet,
            color: "#268473",
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
    <section aria-label="Chỉ số báo cáo" className={styles.metrics}>
      {metrics
        .filter((metric) => features.issues || metric.id !== "violations")
        .map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.id}
              data-report-metric={metric.id}
              className={styles.metric}
              style={{ "--metric-color": metric.color } as CSSProperties}
            >
              <div className={styles.metricTop}>
                <h3 className={styles.metricLabel}>{metric.label}</h3>
                <span className={styles.metricIcon}>
                  <Icon aria-hidden="true" size={16} />
                </span>
              </div>
              <p className={styles.metricValue}>{metric.value}</p>
              <p className={styles.metricDetail}>{metric.detail}</p>
              {report.comparison?.mode !== "none" && (
                <ReportChange change={report.comparison?.changes[metric.id]} />
              )}
              <details className={styles.metricFoot}>
                <summary className="w-fit cursor-pointer hover:text-blue-600">
                  Cách tính
                </summary>
                <p className="mt-2 leading-5">{metric.formula}</p>
              </details>
            </article>
          );
        })}
    </section>
  );
}
