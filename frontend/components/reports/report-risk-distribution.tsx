import type { OperationalReport } from "@/types/reports";
import { formatReportPercent } from "@/lib/reports/report-format";
import { issueBucketLabels } from "@/config/issue-display";
import reportStyles from "./reports.module.css";

const groups = ["withViolations", "withIssues", "noIssues"] as const;
type Group = (typeof groups)[number];
type IssueCounts = OperationalReport["issues"];

// Status colours, each paired with its label; ink inside a block follows the fill's luminance.
const colors: Record<Group, { fill: string; ink: string }> = {
  withViolations: { fill: "#b65c52", ink: "#ffffff" },
  withIssues: { fill: "#c9a85e", ink: "#2b2618" },
  noIssues: { fill: "#91aa8d", ink: "#1d2a1c" },
};

const share = (issues: IssueCounts, group: Group) =>
  issues.checkedContracts
    ? Math.min(100, Math.max(0, (issues[group] / issues.checkedContracts) * 100))
    : 0;

function SegmentedBar({
  issues,
  label,
  thin = false,
}: {
  issues: IssueCounts;
  label: string;
  thin?: boolean;
}) {
  const description = groups
    .map(
      (group) =>
        `${issueBucketLabels[group]}: ${issues[group]} (${formatReportPercent(issues.percentages?.[group] ?? share(issues, group))})`,
    )
    .join("; ");
  return (
    <div
      role="img"
      aria-label={`${label}. ${description}`}
      className={reportStyles.segmented}
      data-thin={thin}
    >
      {groups.map((group) => {
        const width = share(issues, group);
        if (!width) return null;
        return (
          <span
            key={group}
            title={`${issueBucketLabels[group]}: ${issues[group]}`}
            style={{
              flexGrow: width,
              background: colors[group].fill,
              color: colors[group].ink,
            }}
          >
            {!thin && width >= 9 && (
              <span className="tabular-nums">
                {width.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}%
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function ReportRiskDistribution({
  report,
}: {
  report: OperationalReport;
}) {
  const compare = Boolean(report.comparison?.period);
  const previous = report.comparison?.previousIssues ?? null;
  return (
    <section
      className={`${reportStyles.panel} ${reportStyles.chart} xl:col-span-2`}
    >
      <div className={reportStyles.chartHeader}>
        <div className="min-w-0">
          <h3 className={reportStyles.chartTitle}>Kết quả rà soát hợp đồng</h3>
          <p className={reportStyles.chartDescription}>
            Mỗi hợp đồng lấy lượt rà soát thành công mới nhất có dữ liệu phân
            loại vấn đề trong kỳ.
          </p>
        </div>
        <div className={reportStyles.chartSummary}>
          <strong>
            {report.issues.checkedContracts.toLocaleString("vi-VN")}
          </strong>
          <span>hợp đồng có kết quả</span>
        </div>
      </div>
      {report.issues.checkedContracts === 0 ? (
        <div className={reportStyles.chartEmpty} data-size="sm">
          <p className="text-sm font-medium text-slate-600">
            Chưa có dữ liệu phân loại vấn đề trong kỳ này.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-2">
            <SegmentedBar issues={report.issues} label="Kỳ này" />
            {compare && previous && previous.checkedContracts > 0 && (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="text-[11px] text-slate-400">Kỳ so sánh</span>
                <SegmentedBar issues={previous} label="Kỳ so sánh" thin />
              </div>
            )}
          </div>
          <dl className="m-0 mt-5 grid gap-3 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group} className={reportStyles.distributionItem}>
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span
                    aria-hidden="true"
                    className={reportStyles.legendDot}
                    style={{ background: colors[group].fill }}
                  />
                  {issueBucketLabels[group]}
                </dt>
                <dd className="m-0 mt-2 flex items-baseline gap-2">
                  <strong className="text-xl font-semibold tracking-tight text-slate-800">
                    {report.issues[group].toLocaleString("vi-VN")}
                  </strong>
                  <span className="text-xs tabular-nums text-slate-500">
                    {formatReportPercent(
                      report.issues.percentages?.[group] ?? null,
                    )}
                  </span>
                </dd>
                {compare && (
                  <dd className="m-0 mt-1 text-[11px] text-slate-400">
                    Kỳ so sánh: {previous?.[group] ?? "—"} ·{" "}
                    {formatReportPercent(
                      previous?.percentages?.[group] ?? null,
                    )}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </>
      )}
      <p className="mb-0 mt-5 max-w-[85ch] border-t border-slate-100 pt-4 text-[11px] leading-6 text-slate-400">
        “Có vấn đề khác” gồm hợp đồng có vấn đề nhưng không có vi phạm. Kết quả
        thiếu dữ liệu phân loại không được tính vào mẫu số; “không phát hiện vấn
        đề” chỉ phản ánh các tiêu chí đã kiểm tra.
      </p>
    </section>
  );
}
