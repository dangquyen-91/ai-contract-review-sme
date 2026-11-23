"use client";

import { IssueSummary } from "./issue-summary";
import { reviewIssueCounts } from "@/lib/review/issue-counts";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ContractReviewResult } from "@/types/contracts";
import { ReviewVerification } from "@/components/expert-verification/review-verification";
import { activeRiskFindings } from "@/lib/review/verification-findings";
import styles from "@/styles/review/review-design.module.css";

export function ReviewResultHeader({ result, onShareSummary, role }: { result: ContractReviewResult; onShareSummary: () => void; role?: string }) {
  const version = result.contract.currentVersion;
  const activeFindings = activeRiskFindings(result.findings);
  const rejectedCount = result.findings.length - activeFindings.length;
  const risksComplete = version?.riskDetectionStatus === "completed";
  const complete = risksComplete && version?.summaryStatus === "completed";
  const contractId = result.contract.id ?? result.contract._id;
  const timestamp = version?.updatedAt;
  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && Number.isFinite(date.getTime());

  return <header className={`${styles.scope} ${styles.resultHeader} space-y-5`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className={styles.eyebrow}>Kết quả rà soát hợp đồng</p>
        <h2 className={styles.resultTitle}>{result.contract.title}</h2>
        <p className="mb-0 mt-2 text-xs leading-5 text-[#73766f]">Cập nhật {validDate ? <time dateTime={date.toISOString()}>{date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (GMT+7)</time> : "Chưa có thời điểm cập nhật"}</p>
      </div>
      <Button variant="outline" size="sm" className="max-w-full rounded-md border-[#d8ddd1] bg-white text-[#484d45] shadow-none whitespace-normal hover:bg-[#f4f5f1] hover:text-[#292c28]" disabled={!contractId || !complete} title={!complete ? "Chờ hoàn tất tóm tắt và đánh giá rủi ro để tạo bản chia sẻ" : undefined} onClick={onShareSummary}><Icon name="document" />Tóm tắt để chia sẻ</Button>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5">
      <span className={`${styles.status} ${complete ? "text-[#346538]" : "text-[#856222]"}`}>
        <span aria-hidden="true" className={styles.statusDot} />
        {complete ? "Đã hoàn tất phân tích" : "Phân tích chưa hoàn tất"}
      </span>
      <span className="text-[#93988e]">{risksComplete ? "Vấn đề theo các tiêu chí đã kiểm tra" : "Số vấn đề đã ghi nhận, có thể chưa đầy đủ"}</span>
    </div>
    <IssueSummary counts={reviewIssueCounts(result)} />
    {rejectedCount > 0 && <p className="m-0 text-ui-meta text-muted-foreground">Số liệu không bao gồm {rejectedCount} mục đã được chuyên gia bác bỏ. Xem lại trong bộ lọc “Đã bác bỏ”.</p>}
    {contractId && (
      <ReviewVerification
        key={`${contractId}:${version?._id ?? version?.id ?? "current"}`}
        contractId={contractId}
        versionId={version?._id ?? version?.id ?? result.contract.reviewBilling?.versionId}
        title={result.contract.title}
        complete={complete}
        findingCount={activeFindings.length}
        role={role}
      />
    )}
  </header>;
}
