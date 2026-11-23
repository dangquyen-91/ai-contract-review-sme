"use client";

import { Check, CircleAlert, Clock3, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepState } from "@/lib/review/review-timeline";
import styles from "@/styles/review/review-loading.module.css";

type ReviewLoadingPanelProps = {
  message: string;
  steps: { label: string; state: StepState }[];
  elapsed: string | null;
  live: boolean;
  active: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
  cancelRequested?: boolean;
};

const stateLabels: Record<StepState, string> = {
  pending: "Đang chờ",
  running: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Chưa hoàn tất",
};

function LoadingStepIcon({ state, live, index }: { state: StepState; live: boolean; index: number }) {
  if (state === "completed") return <Check className="size-4" />;
  if (state === "failed") return <CircleAlert className="size-4" />;
  if (state === "running" && live) return <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />;
  return <span>{String(index + 1).padStart(2, "0")}</span>;
}

export function ReviewLoadingPanel({
  message, steps, elapsed, live, active, onCancel, cancelling, cancelRequested,
}: ReviewLoadingPanelProps) {
  const done = steps.filter((step) => step.state === "completed").length;

  return (
    <>
      <div className="px-5 pt-5 sm:px-7">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-ui-caption font-semibold text-blue-700">
          <Sparkles aria-hidden="true" className="size-3.5" />
          LawScan AI
        </span>
      </div>

      <div className="grid items-center gap-6 px-5 pb-7 sm:px-7 md:grid-cols-2 md:gap-10 md:py-7 lg:gap-16">
        <div className="min-w-0">
          <div aria-hidden="true" className={styles.scene} data-live={live}>
            <div className={styles.orbit} />
            <div className={styles.document}>
              <FileText className="size-7 text-blue-500" strokeWidth={1.5} />
              <span className={styles.line} />
              <span className={styles.line} />
              <span className={styles.line} />
              <div className={styles.scan} />
            </div>
            <span className={styles.sparkle}>
              <Sparkles className="size-5" strokeWidth={1.6} />
            </span>
          </div>

          <div className="text-center">
            <h2 className="m-0 text-ui-dialog font-semibold leading-7 text-[#1f2d44]">Tiến trình rà soát AI</h2>
            <p role="status" className="mx-auto mb-0 mt-2 max-w-[400px] text-ui leading-6 text-[#65758b]">
              {message}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-ui-meta">
            <span className="font-medium text-[#536881]">{done}/{steps.length} bước hoàn tất</span>
            {elapsed && (
              <span className="inline-flex items-center gap-1.5 tabular-nums text-[#65758b]">
                <Clock3 aria-hidden="true" className="size-3.5" />
                {elapsed}
              </span>
            )}
          </div>
          <ol className="m-0 grid list-none gap-2 p-0" aria-label="Các bước rà soát">
            {steps.map((step, index) => (
              <li key={step.label} data-state={step.state} aria-current={step.state === "running" ? "step" : undefined} className={styles.step}>
                <span className={styles.stepIcon} aria-hidden="true">
                  <LoadingStepIcon state={step.state} live={live} index={index} />
                </span>
                <span className="min-w-0 flex-1 font-medium">{step.label}</span>
                <span className={styles.stepStatus}>{stateLabels[step.state]}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-3 border-t border-[#e8edf5] bg-[#f8faff] px-5 py-4 sm:px-7">
          <p className="m-0 min-w-0 flex-1 basis-56 text-ui-meta leading-5 text-[#65758b]">
            Bạn có thể rời trang, AI vẫn tiếp tục xử lý.
          </p>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} loading={cancelling} disabled={cancelRequested}>
              {cancelRequested ? "Đang dừng…" : "Dừng rà soát"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
