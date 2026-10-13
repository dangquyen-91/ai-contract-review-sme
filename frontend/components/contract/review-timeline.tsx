"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "@/styles/review/review-timeline.module.css";
import { buildReviewTimeline, reviewElapsed, type StepState, type TimelineInput } from "@/lib/review-timeline";

const labels: Record<StepState, string> = { pending: "Đang chờ", running: "Đang xử lý", completed: "Hoàn thành", failed: "Thất bại" };
const colors: Record<StepState, string> = {
  pending: "border-[#dce3ec] bg-white text-[#718096]",
  running: "border-[#abc6f5] bg-[#edf4ff] text-[#245abf]",
  completed: "border-[#bfdfd3] bg-[#edf8f2] text-[#23705a]",
  failed: "border-[#edc4cd] bg-[#fff1f3] text-[#a53348]",
};

export function ReviewTimeline(props: TimelineInput & {
  roleLabel: string;
  access: { upload: boolean; review: boolean; administer: boolean };
  onRetry: () => void;
}) {
  const id = useId();
  const [now, setNow] = useState(Date.now);
  const model = buildReviewTimeline(props);
  useEffect(() => {
    if (!props.review?.startedAt || props.review.status !== "running" || !props.reviewing || model.interrupted) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [props.review?.startedAt, props.review?.status, props.reviewing, model.interrupted]);
  const elapsed = reviewElapsed(props.review, now);
  const busy = Boolean(props.uploading || props.reviewing || props.loadingResult);
  const showError = Boolean(props.error && !busy);
  const stateLabel = (state: StepState) => state === "failed" && model.retrying ? "Chờ thử lại"
    : state === "running" && props.review?.status === "failed" ? "Chưa hoàn tất"
    : state === "running" && model.interrupted ? "Trạng thái lần cuối" : labels[state];

  return <aside className="grid min-w-0 gap-4" aria-labelledby={`${id}-title`}>
    <section className="rounded-[14px] border border-[#e4e8ef] bg-white p-5 shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <header className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-[#2864dc]"><Icon name="sparkle" className="h-5 w-5" /></span>
        <div className="min-w-0"><h2 id={`${id}-title`} className="m-0 text-ui-card font-semibold">Quy trình AI</h2><p className="mb-0 mt-1 text-ui-meta text-[#607087]" aria-live="off">{elapsed ? `Thời gian xử lý: ${elapsed}` : "Theo dõi trạng thái từ hệ thống"}</p></div>
      </header>
      <p role="status" className="mb-0 mt-4 rounded-lg bg-[#f6f8fc] p-3 text-ui leading-6 text-[#536881]">{model.message}</p>
      <ol className={styles.steps}>
        {model.steps.map((step, index) => <li key={step.key} data-review-step="true" aria-current={step.state === "running" && !model.interrupted ? "step" : undefined} className={styles.step}>
          {index < model.steps.length - 1 && <span aria-hidden="true" className={`${styles.connector} ${step.state === "completed" ? styles.connectorComplete : ""}`} />}
          <span aria-hidden="true" className={`z-[1] grid h-8 w-8 place-items-center rounded-full border text-ui-meta font-semibold ${colors[step.state]}`}>
            {step.state === "completed" ? <Icon name="check" className="h-4 w-4" /> : step.state === "failed" ? "!" : step.state === "running" && !model.interrupted ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#abc6f5] border-t-[#245abf] motion-reduce:animate-none" /> : index + 1}
          </span>
          <div className={styles.body}><div className={styles.heading}><strong className="text-ui font-semibold text-[#263750]">{step.label}</strong><span className={`text-ui-caption font-semibold ${step.state === "failed" ? "text-[#a53348]" : step.state === "completed" ? "text-[#23705a]" : "text-[#607087]"}`}>{stateLabel(step.state)}</span></div>
            <p className="mb-0 mt-1 text-ui-meta leading-5 text-[#718096]">{step.description}</p>
            {step.key === "analysis" && <ul className="mb-0 mt-2 grid list-none gap-1 rounded-lg bg-[#f8faff] p-2.5">{model.tasks.map((task) => <li key={task.label} className="flex flex-wrap justify-between gap-2 text-ui-meta"><span className="text-[#536881]">{task.label}</span><span className={task.state === "failed" ? "text-[#a53348]" : task.state === "completed" ? "text-[#23705a]" : "text-[#607087]"}>{stateLabel(task.state)}</span></li>)}</ul>}
          </div>
        </li>)}
      </ol>
      {showError && <div role="alert" className="mt-4 rounded-lg border border-[#edc4cd] bg-[#fff5f6] p-3 text-ui leading-6 text-[#a53348]"><p className="m-0">{props.error}</p><button type="button" onClick={props.onRetry} className="mt-3 min-h-10 rounded-lg border border-[#edc4cd] bg-white px-3 py-2 text-ui font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9bbcf8]">{props.failureKind === "load" ? "Tải lại kết quả" : props.review?.status === "failed" ? "Thử rà soát lại" : "Tiếp tục theo dõi"}</button><p className="mb-0 mt-2 text-ui-meta">{props.failureKind === "load" ? "Tải lại kết quả không tạo lượt AI mới." : props.review?.status === "failed" ? "Thử lại một lượt thất bại có thể tạo lượt AI mới." : "Tiếp tục yêu cầu đã lưu, không cần tải lại tệp."}</p></div>}
    <footer className={styles.permissions} aria-label="Quyền hiện tại">
      <p className="m-0 text-ui-meta text-[#607087]">Quyền hiện tại · <strong className="font-semibold text-[#263750]">{props.roleLabel}</strong></p>
      <ul className="text-ui-meta">{[{ label: "Tải hợp đồng", allowed: props.access.upload }, { label: "Chạy AI review", allowed: props.access.review }, ...(props.access.administer ? [{ label: "Quản trị tổ chức", allowed: true }] : [])].map((permission) => <li key={permission.label} className="flex items-center gap-2 text-[#607087]"><Icon name={permission.allowed ? "check" : "lock"} className={`h-3.5 w-3.5 ${permission.allowed ? "text-[#23705a]" : "text-[#718096]"}`} />{permission.label}</li>)}</ul>
    </footer>
    </section>
  </aside>;
}
