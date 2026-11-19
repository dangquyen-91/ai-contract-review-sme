import Link from "next/link";
import { ChevronRight, Download, Info, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { findingDisplay } from "@/config/issue-display";
import { compareFindings, countFindingIssues } from "@/lib/review/issue-counts";
import { IssueSummary } from "@/components/review/results/issue-summary";
import { ReviewCoverage } from "@/components/review/results/review-coverage";
import { ContractSummary } from "@/components/review/results/contract-summary";
import { RiskDetails } from "@/components/review/results/risk-details";
import { FindingVerificationBadge } from "@/components/expert-verification/finding-verification-info";
import { routes } from "@/config/routes";
import { clauseLabel } from "@/lib/review/clause-label";
import type { ContractReviewRun, ContractVersionSummary, RiskFinding } from "@/types/contracts";

const statusLabels: Record<ContractReviewRun["status"], string> = {
  queued: "Đang chờ",
  running: "Đang rà soát",
  completed: "Hoàn tất",
  failed: "Chưa hoàn tất",
  cancelled: "Đã dừng",
};

function formatDateTime(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function HistoryBanner({ contractId, run, version, current }: {
  contractId: string;
  run: ContractReviewRun;
  version?: ContractVersionSummary;
  current?: ContractVersionSummary;
}) {
  const oldVersion = Boolean(version && !version.isCurrent);
  const olderRun = Boolean(version?.isCurrent && version.latestReview && version.latestReview.id !== run._id);
  if (!oldVersion && !olderRun) return null;
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border p-4 text-ui leading-6 ${oldVersion ? "border-amber-200 bg-amber-50 text-amber-950" : "border-blue-200 bg-blue-50 text-blue-950"}`}>
      {oldVersion ? <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-1 size-4 shrink-0" />}
      <div>
        <p className="m-0 font-semibold">
          {oldVersion ? `Bạn đang xem kết quả của phiên bản cũ (phiên bản ${version?.versionNumber}).` : "Bạn đang xem một lượt rà soát trước của phiên bản hiện tại."}
        </p>
        <p className="m-0">
          {oldVersion
            ? `Hợp đồng đã có phiên bản ${current?.versionNumber ?? "mới hơn"}. Rà soát, hỏi đáp và chỉnh sửa đề xuất chỉ áp dụng cho phiên bản hiện tại. `
            : "Kết quả mới nhất có thể khác lượt này. "}
          <Link className="font-medium underline" href={routes.contract(contractId)}>Về kết quả hiện tại</Link>
        </p>
      </div>
    </div>
  );
}

function FindingItem({ finding }: { finding: RiskFinding }) {
  const clause = finding.clause;
  const display = findingDisplay(finding);
  return (
    <li className="space-y-2 rounded-lg border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={display.tone}>{display.label}</Badge>
        <FindingVerificationBadge verification={finding.verification} />
        <h3 className="m-0 min-w-0 text-ui-section font-semibold [overflow-wrap:anywhere]">{finding.title}</h3>
      </div>
      {clause && (
        <p className="m-0 text-ui-meta text-muted-foreground">
          {clause.title || clauseLabel(clause)}
        </p>
      )}
      {finding.findingType === "missing_clause" && !clause && (
        <p className="m-0 text-ui-meta text-muted-foreground">Thiếu điều khoản trong hợp đồng</p>
      )}
      {finding.problem.length > 0 && (
        <ul className="m-0 list-disc space-y-1 pl-5 text-ui leading-6 text-slate-700">
          {finding.problem.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
      )}
      <RiskDetails finding={finding} />
    </li>
  );
}

export function ReviewVersionResult({ contractId, title, run, version, current, findings }: {
  contractId: string;
  title: string;
  run: ContractReviewRun;
  version?: ContractVersionSummary;
  current?: ContractVersionSummary;
  findings: RiskFinding[];
}) {
  const counts = run.result?.issueCounts ? findings.length ? countFindingIssues(findings) : run.result.issueCounts : undefined;
  const sorted = [...findings].sort(compareFindings);
  const expected = counts ? counts.total + counts.unverified + counts.referrals : 0;
  const detailsMissing = run.status === "completed" && expected > 0 && sorted.length === 0;
  const started = formatDateTime(run.startedAt);
  const finished = formatDateTime(run.finishedAt);
  return (
    <section className="mx-auto max-w-5xl space-y-5 p-6">
      <nav aria-label="Đường dẫn" className="flex min-w-0 flex-wrap items-center gap-1.5 text-ui-meta text-muted-foreground">
        <Link className="font-medium text-primary hover:underline" href={routes.contracts}>Hợp đồng</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
        <Link className="min-w-0 truncate font-medium text-primary hover:underline" href={routes.contract(contractId)}>{title}</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
        <span aria-current="page">Lượt rà soát{finished ? ` ${finished}` : ""}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="m-0 text-[clamp(22px,2.4vw,28px)] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={version?.isCurrent ? "info" : "warning"}>
            {version ? `Phiên bản ${version.versionNumber}${version.isCurrent ? " · hiện tại" : " · bản cũ"}` : "Lượt rà soát"}
          </Badge>
        </div>
        {version?.note && <p className="m-0 text-ui text-slate-700">{version.note}</p>}
        <p className="m-0 text-ui-meta text-muted-foreground">
          {[statusLabels[run.status], started && `Bắt đầu ${started}`, finished && `Kết thúc ${finished}`].filter(Boolean).join(" · ")}
        </p>
      </header>
      <HistoryBanner contractId={contractId} run={run} version={version} current={current} />
      {run.error && <p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 p-3 text-ui text-red-800">{run.error}</p>}
      <ContractSummary points={run.result?.summaryPoints} sources={run.result?.summarySources} complete={run.status === "completed"} />
      <ReviewCoverage coverage={run.result?.checkCoverage} />
      <IssueSummary counts={counts} />
      {counts && (
        <div className="flex flex-wrap items-center gap-2 text-ui">
          {version && (
            <a
              className="ml-auto inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
              href={`/api/contracts/${contractId}/file?versionId=${version.id}`}
            >
              <Download aria-hidden="true" className="size-4" />
              Tải tệp phiên bản này
            </a>
          )}
        </div>
      )}
      {detailsMissing && (
        <p className="m-0 rounded-lg border border-border bg-slate-50 p-3 text-ui leading-6 text-slate-700">
          Chi tiết từng mục chưa có sẵn cho lượt rà soát này. Số liệu tổng hợp phía trên là kết quả đã lưu của lượt này.
        </p>
      )}
      {sorted.length > 0 && (
        <ol className="m-0 list-none space-y-3 p-0">
          {sorted.map((finding) => <FindingItem key={finding._id ?? finding.id ?? finding.title} finding={finding} />)}
        </ol>
      )}
    </section>
  );
}
