import type { OperationalReport } from "@/types/reports";
import { formatReportPercent } from "@/lib/reports/report-format";
import { issueBucketLabels } from "@/config/issue-display";
import styles from "@/styles/review/review-design.module.css";
import reportStyles from "./reports.module.css";

const groups = ["withViolations", "withIssues", "noIssues"] as const;
const colors = {
  withViolations: { text: "text-[#9f2f2d]", bar: "bg-[#b65c52]" },
  withIssues: { text: "text-[#856222]", bar: "bg-[#b69a5b]" },
  noIssues: { text: "text-[#346538]", bar: "bg-[#91aa8d]" },
};

export function ReportRiskDistribution({
  report,
}: {
  report: OperationalReport;
}) {
  const compare = Boolean(report.comparison?.period);
  return (
    <section
      className={`${styles.scope} ${reportStyles.panel} ${reportStyles.chart} xl:col-span-2`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={reportStyles.chartTitle}>Kết quả rà soát hợp đồng</h3>
        <span className="text-xs tabular-nums text-[#73766f]">
          {report.issues.checkedContracts} hợp đồng có kết quả
        </span>
      </div>
      <p className="mb-0 mt-2 max-w-[65ch] text-xs leading-6 text-[#73766f]">
        Mỗi hợp đồng lấy lượt rà soát thành công mới nhất có dữ liệu phân loại
        vấn đề trong kỳ.
      </p>
      {report.issues.checkedContracts === 0 ? (
        <p className="mb-0 mt-5 border-t border-[#e4e6df] pt-5 text-ui-meta leading-7 text-[#73766f]">
          Chưa có dữ liệu phân loại vấn đề trong kỳ này.
        </p>
      ) : (
        <dl className="m-0 mt-4">
          {groups.map((group) => (
            <div key={group} className={styles.distributionRow}>
              <dt className="flex items-center gap-2 text-xs font-medium text-[#484d45]">
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${colors[group].bar}`}
                />
                {issueBucketLabels[group]}
              </dt>
              <dd
                aria-hidden="true"
                className={`${styles.distributionTrack} m-0 h-1.5 overflow-hidden rounded-sm bg-[#f0f2ec]`}
              >
                <div
                  className={`h-full rounded-sm ${colors[group].bar}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (report.issues[group] / report.issues.checkedContracts) * 100))}%`,
                  }}
                />
              </dd>
              <dd className="m-0 flex items-baseline justify-end gap-3 text-right">
                <strong
                  className={`text-xl font-medium tabular-nums tracking-tight ${colors[group].text}`}
                >
                  {report.issues[group]}
                </strong>
                <span className="min-w-12 text-[11px] tabular-nums text-[#93988e]">
                  {formatReportPercent(
                    report.issues.percentages?.[group] ?? null,
                  )}
                </span>
              </dd>
              {compare && (
                <dd className="col-span-full m-0 text-[11px] text-[#93988e]">
                  Kỳ so sánh:{" "}
                  {report.comparison?.previousIssues?.[group] ?? "—"} ·{" "}
                  {formatReportPercent(
                    report.comparison?.previousIssues?.percentages?.[group] ??
                      null,
                  )}
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
      <p className="mb-0 mt-5 max-w-[85ch] border-t border-[#e4e6df] pt-4 text-[11px] leading-6 text-[#93988e]">
        “Có vấn đề khác” gồm hợp đồng có vấn đề nhưng không có vi phạm. Kết quả
        thiếu dữ liệu phân loại không được tính vào mẫu số; “không phát hiện vấn
        đề” chỉ phản ánh các tiêu chí đã kiểm tra.
      </p>
    </section>
  );
}
