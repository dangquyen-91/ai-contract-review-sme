"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ContractReviewResult } from "@/types/contracts";
import { ReviewVerification } from "@/components/expert-verification/review-verification";

const levels = [
  { severity: "high", label: "Rủi ro cao", tone: "border-rose-200 bg-rose-50 text-rose-800" },
  { severity: "medium", label: "Rủi ro trung bình", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  { severity: "low", label: "Rủi ro thấp", tone: "border-blue-200 bg-blue-50 text-blue-800" },
] as const;

export function ReviewResultHeader({ result, onShareSummary, role }: { result: ContractReviewResult; onShareSummary: () => void; role?: string }) {
  const version = result.contract.currentVersion;
  const risksComplete = version?.riskDetectionStatus === "completed";
  const complete = risksComplete && version?.summaryStatus === "completed";
  const contractId = result.contract.id ?? result.contract._id;
  const timestamp = version?.updatedAt;
  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && Number.isFinite(date.getTime());

  return <header className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="m-0 text-ui-caption font-semibold uppercase tracking-wide text-primary">Kết quả rà soát AI</p>
        <h2 className="mb-0 mt-2 break-words text-ui-dialog font-semibold leading-tight text-card-foreground [overflow-wrap:anywhere]">{result.contract.title}</h2>
        <p className="mb-0 mt-2 text-ui-meta leading-5 text-muted-foreground">Cập nhật kết quả: {validDate ? <time dateTime={date.toISOString()}>{date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (GMT+7)</time> : "Chưa có thời điểm cập nhật"}</p>
      </div>
      <Button variant="outline" size="sm" className="max-w-full whitespace-normal" disabled={!contractId || !complete} title={!complete ? "Chờ hoàn tất tóm tắt và đánh giá rủi ro để tạo bản chia sẻ" : undefined} onClick={onShareSummary}><Icon name="document" />Tóm tắt để chia sẻ</Button>
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-meta leading-5">
      <span className={`inline-flex items-center gap-1.5 font-semibold ${complete ? "text-emerald-800" : "text-amber-900"}`}><Icon name={complete ? "check" : "sparkle"} className="size-4 shrink-0" />{complete ? "Đã hoàn tất phân tích" : "Phân tích chưa hoàn tất"}</span>
      <span className="text-muted-foreground">{risksComplete ? "Số rủi ro theo kết quả đã lưu" : "Số rủi ro đã ghi nhận, có thể chưa đầy đủ"}</span>
    </div>
    <dl className="m-0 grid grid-cols-1 gap-2 min-[400px]:grid-cols-3 sm:gap-3" aria-label="Tổng quan mức rủi ro">
      {levels.map(({ severity, label, tone }) => <div key={severity} className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 ${tone}`}>
        <dt className="text-ui-meta font-semibold">{label}</dt>
        <dd className="m-0 text-xl font-bold leading-none tabular-nums">{result.findings.filter((finding) => finding.severity === severity).length}</dd>
      </div>)}
    </dl>
    {contractId && (
      <ReviewVerification
        key={`${contractId}:${version?.updatedAt ?? ""}`}
        contractId={contractId}
        versionId={version?._id ?? version?.id ?? result.contract.reviewBilling?.versionId}
        title={result.contract.title}
        complete={complete}
        findingCount={result.findings.length}
        role={role}
      />
    )}
  </header>;
}
