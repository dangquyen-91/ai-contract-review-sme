"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewBlockedNotice } from "@/components/review/timeline/review-blocked-notice";
import { buildReviewTimeline, reviewElapsed, type StepState, type TimelineInput } from "@/lib/review/review-timeline";

type Step = { label: string; state: StepState };

function StepIcon({ state, live }: { state: StepState; live: boolean }) {
  if (state === "completed") return <Check aria-hidden="true" className="size-3.5" />;
  if (state === "failed") return <CircleAlert aria-hidden="true" className="size-3.5" />;
  if (state === "running" && live) return <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />;
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />;
}

const stepTones: Record<StepState, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  running: "border-blue-200 bg-blue-50 text-blue-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  pending: "border-slate-200 bg-white text-slate-500",
};

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
  const done = steps.filter((step) => step.state === "completed").length;
  const unfinished = props.review?.status === "failed" || props.review?.status === "cancelled";
  const showError = Boolean(props.error && !busy && !props.blocked);
  const partialSummary = unfinished && props.review?.result?.partial ? props.review.result.summaryPoints ?? [] : [];
  const cancellable = props.onCancel && live && (props.review?.status === "queued" || props.review?.status === "running");

  return (
    <section aria-label="Tiến trình rà soát" className="rounded-[14px] border border-[#e4e8ef] bg-white p-5 shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 ${live ? "animate-pulse motion-reduce:animate-none" : ""}`}>
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p role="status" className="m-0 text-ui-section font-semibold text-[#1f2d44]">{model.message}</p>
          <p className="mb-0 mt-0.5 text-ui-meta text-muted-foreground">
            {done}/{steps.length} bước hoàn tất{elapsed ? ` · ${elapsed}` : ""}
            {live ? " · Bạn có thể rời trang, AI vẫn tiếp tục xử lý." : ""}
          </p>
        </div>
        {cancellable && (
          <Button variant="outline" size="sm" onClick={props.onCancel} loading={props.cancelling} disabled={Boolean(props.review?.cancelRequested)}>
            {props.review?.cancelRequested ? "Đang dừng…" : "Dừng rà soát"}
          </Button>
        )}
      </div>
      <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
        {steps.map((step) => (
          <li key={step.label} aria-current={step.state === "running" ? "step" : undefined} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-ui-meta font-medium ${stepTones[step.state]}`}>
            <StepIcon state={step.state} live={live} />
            {step.label}
          </li>
        ))}
      </ol>
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
    </section>
  );
}
