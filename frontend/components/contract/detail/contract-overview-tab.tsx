"use client";

import { ReviewVerification } from "@/components/expert-verification/review-verification";
import { IssueSummary } from "@/components/review/results/issue-summary";
import { ContractSummary } from "@/components/review/results/contract-summary";
import { ReviewCoverage } from "@/components/review/results/review-coverage";
import { activeRiskFindings } from "@/lib/review/verification-findings";
import { reviewIssueCounts } from "@/lib/review/issue-counts";
import type { ContractQuote, ContractReviewResult } from "@/types/contracts";
import styles from "@/styles/review/review-design.module.css";

export function ContractOverviewTab({ result, role, onOpenRisks, onSource }: {
  result: ContractReviewResult;
  role?: string;
  onOpenRisks: () => void;
  onSource?: (source: ContractQuote) => void;
}) {
  const version = result.contract.currentVersion;
  const contractId = result.contract.id ?? result.contract._id;
  const findings = activeRiskFindings(result.findings);
  const rejected = result.findings.length - findings.length;
  const complete = version?.riskDetectionStatus === "completed" && version?.summaryStatus === "completed";
  return (
    <div className={`${styles.scope} ${styles.overview} grid gap-6 bg-white p-5 sm:p-6`}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`${styles.status} m-0 ${complete ? "text-emerald-700" : "text-amber-700"}`}>
            <span aria-hidden="true" className={styles.statusDot} />
            {complete ? "Đã hoàn tất rà soát" : "Phân tích chưa hoàn tất, số liệu có thể chưa đầy đủ"}
          </p>
          <button type="button" onClick={onOpenRisks} className={styles.textAction}>
            Xem {findings.length} mục trong kết quả <span aria-hidden="true">→</span>
          </button>
        </div>
        <IssueSummary counts={reviewIssueCounts(result)} onOpen={onOpenRisks} />
        {rejected > 0 && <p className="m-0 text-ui-meta text-muted-foreground">Không tính {rejected} mục đã được chuyên gia bác bỏ.</p>}
        <ReviewCoverage coverage={version?.checkCoverage} />
      </section>
      {contractId && <ReviewVerification key={`${contractId}:${version?._id ?? version?.id ?? "current"}`}
        contractId={contractId} versionId={version?._id ?? version?.id ?? result.contract.reviewBilling?.versionId}
        title={result.contract.title} complete={complete} findingCount={findings.length} role={role} />}
      <div className="grid gap-6 border-t border-border pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ContractSummary points={version?.summaryPoints} sources={version?.summarySources} clauses={result.clauses} complete={version?.summaryStatus === "completed"} onSource={onSource} />
        <section className={`${styles.overviewAssessment} min-w-0 self-start p-5`}>
          <h3 className={styles.sectionHeading}>Đánh giá tổng quan</h3>
          {version?.overallAssessment?.length ? <ul className={`${styles.assessmentList} space-y-3`}>{version.overallAssessment.map((point, index) => <li key={index}>{point}</li>)}</ul> : <p className="mb-0 mt-3 text-ui-meta text-muted-foreground">Chưa có đánh giá tổng quan.</p>}
        </section>
      </div>
    </div>
  );
}
