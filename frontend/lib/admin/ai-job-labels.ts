import type { AiJob, AiJobErrorCode, AiJobStage, AiJobStatus, AiJobStep, AiJobStepStatus, AiUsageKind } from "@/types/admin-operations";

export const aiJobStatusLabels: Record<AiJobStatus, string> = {
  queued: "Đang chờ",
  running: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

export const aiJobStageLabels: Record<AiJobStage, string> = {
  waiting_for_extraction: "Đọc tệp hợp đồng",
  segmentation: "Tách điều khoản",
  summary: "Tóm tắt",
  risk_detection: "Phát hiện rủi ro",
};

const stepLabels: [AiJobStep, string][] = [
  ["segmentation", "Tách điều khoản"],
  ["summary", "Tóm tắt"],
  ["riskDetection", "Phát hiện rủi ro"],
];
export type AiJobStepState = AiJobStepStatus | "stopped";
const stepStatusLabels: Record<AiJobStepState, string> = {
  pending: "Chưa chạy",
  running: "Đang chạy",
  completed: "Xong",
  failed: "Lỗi",
  stopped: "Đã dừng",
};

/**
 * The analysis steps of a job, in order, with how far each got. A cancelled job's
 * interrupted step is shown as stopped, not failed.
 */
export const aiJobSteps = (job: Pick<AiJob, "stages" | "status">) =>
  stepLabels.map(([step, label]) => {
    const stored = job.stages?.[step] ?? "pending";
    const status: AiJobStepState = job.status === "cancelled" && (stored === "failed" || stored === "running") ? "stopped" : stored;
    return { step, label, status, statusLabel: stepStatusLabels[status] };
  });

export const aiJobErrorLabels: Record<AiJobErrorCode, string> = {
  AI_OVERLOADED: "AI quá tải",
  EXTRACTION_TIMEOUT: "Đọc tệp quá lâu",
  EXTRACTION_FAILED: "Không đọc được tệp",
  CONTRACT_DELETED: "Hợp đồng đã bị xóa",
  CREDIT_EXPIRED: "Lượt đã hết hạn",
  CANCELLED: "Đã hủy",
  UNKNOWN: "Lỗi khác",
};

export const aiUsageKindLabels: Record<AiUsageKind, string> = {
  analysis: "Rà soát hợp đồng",
  chat: "Hỏi đáp AI",
  drafting: "Soạn thảo AI",
};

/** A job can be stopped while it is still waiting or running. */
export const canCancelAiJob = (job: Pick<AiJob, "status">) => job.status === "queued" || job.status === "running";

const statusTones = { queued: "muted", running: "info", completed: "success", failed: "danger", cancelled: "muted" } as const;

/** The badge shown for a job; a stuck job is flagged above its raw status. */
export function aiJobBadge(job: Pick<AiJob, "status" | "stuck">) {
  if (job.stuck) return { label: job.status === "queued" ? "Chờ quá lâu" : "Có thể bị treo", tone: "warning" as const };
  return { label: aiJobStatusLabels[job.status], tone: statusTones[job.status] };
}

/** "2 phút 5 giây", "45 giây" or "—". */
export function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes} phút ${seconds % 60} giây` : `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} giờ ${minutes % 60} phút` : `${hours} giờ`;
}

/** How long a job took, or has been waiting or running so far at `now`. */
export function aiJobElapsedMs(job: Pick<AiJob, "status" | "createdAt" | "startedAt" | "durationMs">, now: number) {
  if (job.durationMs !== null) return job.durationMs;
  const since = job.status === "running" && job.startedAt ? job.startedAt : job.status === "queued" ? job.createdAt : null;
  return since ? Math.max(0, now - new Date(since).getTime()) : null;
}
