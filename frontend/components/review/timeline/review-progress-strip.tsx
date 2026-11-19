"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReviewBlockedNotice } from "@/components/review/timeline/review-blocked-notice";
import { ReviewLoadingPanel } from "@/components/review/timeline/review-loading-panel";
import { buildReviewTimeline, reviewElapsed, type StepState, type TimelineInput } from "@/lib/review/review-timeline";

type Step = { label: string; state: StepState };

export function ReviewProgressStrip(props: TimelineInput & {
  role: string;
  onRetry: () => void;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  const model = buildReviewTimeline(props);
  const busy = Boolean(props.reviewing || props.loadingResult);
  const live = busy && !model.interrupted && !props.blocked;
  const active = Boolean((busy || props.reconnecting) && !props.blocked);
  useEffect(() => {
    if (!props.review?.startedAt || props.review.status !== "running" || !live) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [props.review?.startedAt, props.review?.status, live]);
  const elapsed = reviewElapsed(props.review, now);
  const [reading, segmentation] = model.steps;
  const [summary, risk] = model.tasks;
  const steps: Step[] = [
    { label: reading.label, state: reading.state },
    { label: segmentation.label, state: segmentation.state },
    { label: "Tóm tắt", state: summary.state },
    { label: "Đánh giá rủi ro", state: risk.state },
  ];
  const unfinished = props.review?.status === "failed" || props.review?.status === "cancelled";
  const showError = Boolean(props.error && !busy && !props.blocked);
  const partialSummary = unfinished && props.review?.result?.partial ? props.review.result.summaryPoints ?? [] : [];
  const cancellable = props.onCancel && live && (props.review?.status === "queued" || props.review?.status === "running");

  return (
    <section aria-label="Tiến trình rà soát" className="overflow-hidden rounded-[14px] border border-[#e4e8ef] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <ReviewLoadingPanel
        message={model.message}
        steps={steps}
        elapsed={elapsed}
        live={live}
        active={active}
        onCancel={cancellable ? props.onCancel : undefined}
        cancelling={props.cancelling}
        cancelRequested={props.review?.cancelRequested}
      />
      {((props.blocked && !busy) || showError) && (
        <div className="px-5 pb-5 sm:px-7">
          {props.blocked && !busy && <ReviewBlockedNotice reason={props.blocked} role={props.role} />}
          {showError && (
            <div role="alert" className="mt-4 rounded-lg border border-[#edc4cd] bg-[#fff5f6] p-3 text-ui leading-6 text-[#a53348]">
              <p className="m-0">{props.error}</p>
              <Button variant="outline" size="sm" onClick={props.onRetry} className="mt-3">
                {props.failureKind === "load" ? "Tải lại kết quả" : unfinished ? "Thử lại từ bước chưa xong" : "Tiếp tục theo dõi"}
              </Button>
              <p className="mb-0 mt-2 text-ui-meta">
                {props.failureKind === "load"
                  ? "Tải lại kết quả không tạo lượt AI mới."
                  : unfinished
                    ? "Chỉ chạy lại các bước chưa hoàn tất. Lượt rà soát chỉ bị trừ khi hoàn tất."
                    : "Tiếp tục yêu cầu đã lưu, không cần tải lại tệp."}
              </p>
              {partialSummary.length > 0 && (
                <div className="mt-3 rounded-md border border-[#f1d6dc] bg-white p-2.5 text-[#536881]">
                  <p className="m-0 text-ui-meta font-semibold text-[#263750]">Phần đã hoàn tất · Tóm tắt</p>
                  <ul className="mb-0 mt-1.5 grid list-disc gap-1 pl-4 text-ui-meta leading-5">
                    {partialSummary.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
