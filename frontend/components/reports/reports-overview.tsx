"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { useReport } from "@/hooks/reports/use-report";
import { reportCsv } from "@/lib/reports/report-format";
import type { ReportFilters as Filters } from "@/types/reports";
import { ReportFilters } from "./report-filters";
import { ReportMetrics } from "./report-metrics";
import { ReportCharts } from "./report-charts";

const initialFilters: Filters = {
  period: "month",
  comparison: "previous",
  granularity: "auto",
};

export function ReportsOverview({
  organizationOnly = false,
}: {
  organizationOnly?: boolean;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const query = useReport(applied);
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
    <>
      <PageHeading
        eyebrow="Phân tích"
        title="Báo cáo & thống kê"
        description="Theo dõi hoạt động và so sánh kết quả theo tuần, tháng, quý hoặc năm."
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
        organizationOnly={organizationOnly}
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
        <p role="status" className="py-16 text-center text-sm text-slate-500">
          Đang tính số liệu báo cáo…
        </p>
      ) : (
        <>
          <div
            role="status"
            className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-6 text-slate-600"
          >
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
            <p>
              Cập nhật{" "}
              {new Date(report.computedAt).toLocaleString("vi-VN", {
                timeZone: report.timezone,
              })}
              . Mốc kết thúc thực tế:{" "}
              {new Date(report.period.toExclusive).toLocaleString("vi-VN", {
                timeZone: report.timezone,
              })}{" "}
              (không bao gồm mốc này).
            </p>
          </div>
          <ReportMetrics report={report} />
          <ReportCharts report={report} />
          <details className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-sm text-slate-700">
            <summary className="cursor-pointer font-semibold text-blue-900">
              Quy tắc tính và đọc báo cáo
            </summary>
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
              <li>
                Rủi ro dùng kết quả thành công mới nhất trong kỳ của mỗi hợp
                đồng. Kết quả thiếu mức rủi ro không được coi là không có rủi
                ro.
              </li>
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
              <li>
                Thanh toán đã nhận tính theo ngày xác nhận thanh toán VND. Không
                cộng đơn chưa trả tiền, đã hủy hoặc hết hạn. Đây là tiền thu
                được, không phải lợi nhuận.
              </li>
              <li>
                Ô trống hoặc “Chưa có dữ liệu” khác với số 0. Biểu đồ so sánh
                các nhóm theo thứ tự trong kỳ; bảng chi tiết và CSV ghi rõ ngày
                của cả hai kỳ. Số liệu dựa trên bản ghi còn lưu trong hệ thống.
              </li>
            </ul>
          </details>
        </>
      )}
    </>
  );
}
