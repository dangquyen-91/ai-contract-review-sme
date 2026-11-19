"use client";

import { useState } from "react";
import { ReportPageHeader } from "./report-page-header";
import styles from "./reports.module.css";
import { Button } from "@/components/ui/button";
import { useReport } from "@/hooks/reports/use-report";
import { reportCsv } from "@/lib/reports/report-format";
import type { ReportFilters as Filters } from "@/types/reports";
import { ReportFilters } from "./report-filters";
import { ReportMetrics } from "./report-metrics";
import { ReportCharts } from "./report-charts";
import {
  operationalReportFeatures,
  roleReportConfig,
} from "@/config/report-profiles";

const initialFilters: Filters = {
  period: "month",
  comparison: "previous",
  granularity: "auto",
};

export function ReportsOverview({
  organizationOnly = false,
  scopeId,
}: {
  organizationOnly?: boolean;
  scopeId?: string;
}) {
  const role = organizationOnly ? "owner" : "administrator";
  const config = roleReportConfig[role];
  const features = operationalReportFeatures(role);
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const query = useReport(applied, role, scopeId);
  const report = query.data;
  const ready = !!report && !query.isPlaceholderData && !query.isError;

  function apply() {
    const { anchor, start, end, ...common } = filters;
    setApplied({
      ...common,
      ...(filters.period === "custom" ? { start, end } : { anchor }),
    });
  }

  function download() {
    if (!ready || !report) return;
    const url = URL.createObjectURL(
      new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `lawscan-bao-cao-${report.period.startDate}-${report.period.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page} aria-busy={query.isFetching}>
      <ReportPageHeader
        title={config.title}
        description={config.description}
        scope={organizationOnly ? "Không gian tổ chức" : "Toàn hệ thống"}
      />
      <ReportFilters
        value={filters}
        onChange={setFilters}
        onApply={apply}
        onRefresh={() => void query.refetch()}
        onDownload={download}
        report={report}
        fetching={query.isFetching}
        ready={ready}
        organizationOnly={!features.organizationFilter}
      />
      {query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
        >
          {query.error.message}{" "}
          <Button variant="link" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !ready || !report ? (
        <div
          role="status"
          aria-label="Đang tính số liệu báo cáo…"
          className={styles.loading}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} />
          ))}
        </div>
      ) : (
        <>
          <div role="status" className={styles.period}>
            <div>
              <p>
                <strong>Kỳ báo cáo:</strong> {report.period.startDate} –{" "}
                {report.period.endDate} · Giờ Việt Nam
                {report.period.partial ? " · Kỳ chưa kết thúc" : ""}
              </p>
              {report.comparison?.period && (
                <p>
                  <strong>Kỳ so sánh:</strong>{" "}
                  {report.comparison.period.startDate} –{" "}
                  {report.comparison.period.endDate} ·{" "}
                  {report.comparison.mode === "year"
                    ? "Cùng kỳ năm trước"
                    : "Kỳ trước"}
                </p>
              )}
            </div>
            <div className={styles.periodMeta}>
              <span className={styles.statusDot} aria-hidden="true" />
              <span>
                {query.isFetching ? "Đang cập nhật… " : "Cập nhật "}
                {new Date(report.computedAt).toLocaleString("vi-VN", {
                  timeZone: report.timezone,
                })}
              </span>
              <details>
                <summary className="cursor-pointer text-[11px]">
                  Mốc dữ liệu
                </summary>
                <p>
                  Mốc kết thúc thực tế:{" "}
                  {new Date(report.period.toExclusive).toLocaleString("vi-VN", {
                    timeZone: report.timezone,
                  })}{" "}
                  (không bao gồm mốc này).
                </p>
              </details>
            </div>
          </div>
          <div className={styles.sectionTitle}>
            <h2>Tổng quan trong kỳ</h2>
            <p>Các chỉ số chính & mức thay đổi</p>
          </div>
          <ReportMetrics report={report} />
          <div className={styles.sectionTitle}>
            <h2>Phân tích chi tiết</h2>
            <p>Xu hướng hoạt động theo thời gian</p>
          </div>
          <ReportCharts report={report} />
          <details className={styles.notes}>
            <summary>Quy tắc tính và đọc báo cáo</summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-6">
              <li>
                Tuần bắt đầu thứ Hai; tháng, quý và năm theo lịch Việt Nam. Kỳ
                đang diễn ra và kỳ so sánh được cắt đến thời điểm tương ứng.
                Ngày 29/2 đối chiếu với 28/2 khi cần; tuần ISO 53 đối chiếu tuần
                52 nếu năm trước không có tuần 53. Khoảng ngày thực tế luôn hiển
                thị phía trên.
              </li>
              <li>
                Chênh lệch = kỳ này − kỳ so sánh. Tăng/giảm (%) = chênh lệch ÷
                kỳ so sánh × 100%. Khi kỳ so sánh bằng 0, không tính phần trăm
                tăng trưởng. Hai tỷ lệ được so bằng điểm phần trăm.
              </li>
              <li>
                Hợp đồng tải lên tính theo ngày tạo; lượt rà soát tính theo ngày
                kết thúc. Tỷ lệ thành công = thành công ÷ (thành công + thất
                bại) × 100%. Không tính đang chờ, đang chạy hoặc đã hủy vào mẫu
                số.
              </li>
              {features.issues && (
                <li>
                  Phân loại vấn đề dùng lượt rà soát thành công mới nhất có dữ
                  liệu phân loại trong kỳ của mỗi hợp đồng. Kết quả thiếu dữ
                  liệu này không được coi là không phát hiện vấn đề.
                </li>
              )}
              <li>
                Thời gian trung bình = tổng thời gian xử lý hợp lệ ÷ số lượt có
                thời gian hợp lệ. Khi gộp theo tuần/tháng, backend dùng tổng
                thời gian và số lượt, không lấy trung bình của các trung bình.
              </li>
              <li>
                Đơn vị rà soát = làm tròn lên (số trang ÷ 5) mỗi yêu cầu. Báo
                cáo chỉ cộng hạn mức đã chốt thành công; tách riêng rà soát,
                chat và soạn AI.
              </li>
              {features.payments && (
                <li>
                  Thanh toán đã nhận tính theo ngày xác nhận thanh toán VND.
                  Không cộng đơn chưa trả tiền, đã hủy hoặc hết hạn. Đây là tiền
                  thu được, không phải lợi nhuận.
                </li>
              )}
              <li>
                Ô trống hoặc “Chưa có dữ liệu” khác với số 0. Biểu đồ so sánh
                các nhóm theo thứ tự trong kỳ; bảng chi tiết và CSV ghi rõ ngày
                của cả hai kỳ. Số liệu dựa trên bản ghi còn lưu trong hệ thống.
              </li>
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
