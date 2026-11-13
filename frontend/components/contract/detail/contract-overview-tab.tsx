"use client";

import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import { ReviewVerification } from "@/components/expert-verification/review-verification";
import { activeRiskFindings } from "@/lib/review/verification-findings";
import type { ContractReviewResult, RiskFinding } from "@/types/contracts";

const levels = [
  { severity: "high", label: "Rủi ro cao", tone: "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300" },
  { severity: "medium", label: "Rủi ro trung bình", tone: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300" },
  { severity: "low", label: "Rủi ro thấp", tone: "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300" },
] as const;

function PointList({ title, points, empty }: { title: string; points?: string[]; empty: string }) {
  return (
    <section className="space-y-2.5">
      <h2 className="m-0 text-ui-section font-semibold">{title}</h2>
      {points?.length ? (
        <ul className="m-0 grid gap-2 pl-5 text-ui leading-[1.7] text-[#46566e]">
          {points.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
      ) : <p className="m-0 text-ui text-muted-foreground">{empty}</p>}
    </section>
  );
}

function RiskCounters({ findings, onOpenRisks }: { findings: RiskFinding[]; onOpenRisks: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-3">
      {levels.map(({ severity, label, tone }) => (
        <button
          key={severity}
          type="button"
          onClick={onOpenRisks}
          className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${tone}`}
        >
          <span className="text-ui-meta font-semibold">{label}</span>
          <span className="text-2xl font-bold leading-none tabular-nums">
            {findings.filter((finding) => finding.severity === severity).length}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ContractOverviewTab({ result, role, onOpenRisks }: {
  result: ContractReviewResult;
  role?: string;
  onOpenRisks: () => void;
}) {
  const version = result.contract.currentVersion;
  const contractId = result.contract.id ?? result.contract._id;
  const findings = activeRiskFindings(result.findings);
  const rejected = result.findings.length - findings.length;
  const risksComplete = version?.riskDetectionStatus === "completed";
  const complete = risksComplete && version?.summaryStatus === "completed";
  return (
    <div className="grid gap-6 p-5 sm:p-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`m-0 inline-flex items-center gap-1.5 text-ui-meta font-semibold ${complete ? "text-emerald-800" : "text-amber-900"}`}>
            {complete ? <CircleCheck aria-hidden="true" className="size-4" /> : <CircleAlert aria-hidden="true" className="size-4" />}
            {complete ? "AI đã hoàn tất phân tích" : "Phân tích chưa hoàn tất, số liệu có thể chưa đầy đủ"}
          </p>
          <button type="button" onClick={onOpenRisks} className="inline-flex items-center gap-1 p-0 text-ui-meta font-semibold text-primary hover:underline">
            Xem chi tiết {findings.length} rủi ro
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
        <RiskCounters findings={findings} onOpenRisks={onOpenRisks} />
        {rejected > 0 && (
          <p className="m-0 text-ui-meta text-muted-foreground">
            Không tính {rejected} mục đã được chuyên gia bác bỏ.
          </p>
        )}
      </section>
      {contractId && (
        <ReviewVerification
          key={`${contractId}:${version?._id ?? version?.id ?? "current"}`}
          contractId={contractId}
          versionId={version?._id ?? version?.id ?? result.contract.reviewBilling?.versionId}
          title={result.contract.title}
          complete={complete}
          findingCount={findings.length}
          role={role}
        />
      )}
      <div className="grid gap-6 border-t border-border pt-6 lg:grid-cols-2">
        <PointList
          title="Tóm tắt điều hành"
          points={version?.summaryPoints}
          empty={version?.summaryStatus === "completed" ? "Không có điểm tóm tắt để hiển thị." : "Tóm tắt chưa hoàn tất."}
        />
        <PointList
          title="Đánh giá tổng quan"
          points={version?.overallAssessment}
          empty="Chưa có đánh giá tổng quan."
        />
      </div>
    </div>
  );
}
