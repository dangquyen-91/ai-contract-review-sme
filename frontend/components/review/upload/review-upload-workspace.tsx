"use client";

import type { ComponentProps, RefObject } from "react";
import { useDashboardReviewWorkflow } from "@/providers/review-workflow-provider";
import type { ReviewBlockReason } from "@/lib/review-failure";
import { ReviewAllowanceSummary } from "@/components/review/upload/review-allowance-summary";
import { ContractUploadForm } from "@/components/review/upload/contract-upload-form";
import { ReviewResults } from "@/components/review/results/review-results";
import { ReviewLayout } from "@/components/review/review-layout";
import { ReviewTimeline } from "@/components/review/timeline/review-timeline";
import { Icon } from "@/components/ui/icon";
import type { ContractReviewResult, ContractReviewRun } from "@/types/contracts";

type ReviewStage = "idle" | "uploading" | "reviewing" | "done";

type ReviewUploadWorkspaceProps = {
  access: { upload: boolean; review: boolean; administer: boolean };
  roleLabel: string;
  role?: string;
  orgId?: string;
  reviewBlocked?: ReviewBlockReason | null;
  formProps: ComponentProps<typeof ContractUploadForm>;
  stage: ReviewStage;
  timelineScrollRequest?: number;
  reviewProgress: ContractReviewRun | null;
  pendingReviewId: string | null;
  showInlineRetry: boolean;
  onRetry: () => void;
  onCancel?: () => void;
  cancelling?: boolean;
  reviewResult: ContractReviewResult | null;
  resultRef: RefObject<HTMLDivElement | null>;
  canAsk: boolean;
  showAiContext: boolean;
  reviewing?: boolean;
  loadingResult?: boolean;
  reconnecting?: boolean;
  reviewError?: string;
  retryKind?: "load" | "run";
};

export function ReviewUploadWorkspace({ access, roleLabel, role, orgId, reviewBlocked, formProps, stage, reviewProgress, onRetry, onCancel, cancelling, reviewResult, resultRef, canAsk, showAiContext, reviewing, loadingResult, reconnecting, reviewError, retryKind }: ReviewUploadWorkspaceProps) {
  const { reviewTimelineRef: timelineRef } = useDashboardReviewWorkflow();
  return <>
    <section className="flex [align-items:end] justify-between gap-7 [&_h1]:text-[length:clamp(30px,3vw,42px)] [&_h1]:leading-[1.12] [&_h1]:tracking-[-1.5px] [&_h1]:mt-[7px] [&_h1]:mb-0 [&_h1]:mx-0 [&_div_>_p]:last:max-w-[660px] [&_div_>_p]:last:text-[color:var(--muted)] [&_div_>_p]:last:text-[length:13px] [&_div_>_p]:last:leading-[1.6] [&_div_>_p]:last:mt-[9px] [&_div_>_p]:last:mb-0 [&_div_>_p]:last:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col [&_h1]:[@media_(max-width:_580px)]:text-[length:31px]"><div><p className="text-[color:var(--accent)] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">AI Contract Review</p><h1>Rà soát hợp đồng mới</h1><p>Tải hợp đồng lên để AI tóm tắt, nhận diện điều khoản rủi ro và đề xuất hướng chỉnh sửa.</p></div><div className="flex items-center gap-2.5 flex-none text-[#2b5c51] border [background:#f3faf8] px-[13px] py-2.5 rounded-[10px] border-solid border-[#d7e9e4] [&>_svg]:w-5 [&_span_>_*]:block [&_strong]:text-[length:10px] [&_small]:text-[#6b817c] [&_small]:text-[length:9px] [&_small]:mt-0.5 [@media_(max-width:_580px)]:w-full"><Icon name="shield" /><span><strong>Dữ liệu riêng tư</strong><small>Chỉ tài khoản có quyền mới truy cập được</small></span></div></section>
    <ReviewAllowanceSummary orgId={orgId} role={role} />
    <ReviewLayout className="mt-7 [@media_(max-width:_580px)]:mt-5"
      form={<section className="overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
        <header className="flex min-h-[74px] items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4">
          <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf1ff] text-ui font-bold text-[color:var(--accent)]">01</span><div><h2 className="m-0 text-ui-card font-semibold">Tải hợp đồng</h2><p className="mb-0 mt-1 text-ui text-[color:var(--muted)]">PDF, DOCX, PNG hoặc JPG · Tối đa 20 MB</p></div></div>
          <span className="rounded-md bg-[#eaf6f1] px-2 py-1 text-ui-caption font-semibold text-[#356556] [@media_(max-width:_580px)]:hidden">{access.upload ? "Được phép tải lên" : "Chỉ xem"}</span>
        </header>
        {access.upload ? <ContractUploadForm {...formProps} isReviewing={reviewing ?? stage === "reviewing"} isLoadingResult={loadingResult} /> : <div className="flex min-h-[220px] items-center gap-4 p-6 text-ui text-[#607087]"><Icon name="lock" /><div><h3 className="m-0 text-ui-section font-semibold">Vai trò của bạn không có quyền tải lên</h3><p className="mb-0 mt-2">{access.review ? "Bạn vẫn có thể rà soát các hợp đồng đã được đội ngũ tải lên." : "Liên hệ quản trị viên để được cấp quyền phù hợp."}</p></div></div>}
      </section>}
      timeline={<div ref={timelineRef} className="scroll-mt-6"><ReviewTimeline role={role} blocked={reviewBlocked} review={reviewProgress} result={stage === "done" ? reviewResult : null} uploading={stage === "uploading"} reviewing={reviewing ?? stage === "reviewing"} loadingResult={loadingResult} reconnecting={reconnecting} error={reviewError} failureKind={retryKind} roleLabel={roleLabel} access={access} onRetry={onRetry} onCancel={onCancel} cancelling={cancelling} /></div>}
      result={reviewResult && <div id="review-result" ref={resultRef} tabIndex={-1} aria-label="Kết quả rà soát hợp đồng" className="scroll-mt-6 focus:outline-none"><ReviewResults result={reviewResult} canAsk={canAsk} showAiContext={showAiContext} /></div>}
    />
  </>;
}
