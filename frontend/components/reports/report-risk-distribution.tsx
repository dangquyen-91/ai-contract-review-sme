import type { OperationalReport } from "@/types/reports";
import { formatReportPercent } from "@/lib/reports/report-format";

export function ReportRiskDistribution({
  report,
}: {
  report: OperationalReport;
}) {
  const compare = !!report.comparison?.period;
  const levels = [
    { key: "high", label: "Rủi ro cao" },
    { key: "medium", label: "Trung bình" },
    { key: "low", label: "Rủi ro thấp" },
    { key: "none", label: "Không phát hiện rủi ro" },
  ] as const;
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Phân bố rủi ro hợp đồng</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Mỗi hợp đồng lấy kết quả thành công mới nhất trong từng kỳ.
      </p>
      <div className="mt-5 space-y-4">
        {levels.map((level) => (
          <div key={level.key} className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-medium">{level.label}</p>
            <p className="mt-2 text-xs text-blue-700">
              Kỳ này: {report.risks[level.key]} ·{" "}
              {formatReportPercent(
                report.risks.percentages?.[level.key] ?? null,
              )}
            </p>
            {compare && (
              <p className="mt-1 text-xs text-slate-500">
                So sánh: {report.comparison?.previousRisk?.[level.key] ?? "—"} ·{" "}
                {formatReportPercent(
                  report.comparison?.previousRisk?.percentages?.[level.key] ??
                    null,
                )}
              </p>
            )}
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${report.risks.percentages?.[level.key] ?? 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {report.risks.unknown > 0 && (
        <p className="mt-4 text-xs text-amber-800">
          {report.risks.unknown} hợp đồng thiếu kết quả rủi ro, không tính vào
          mẫu số.
        </p>
      )}
    </section>
  );
}
