import type { ContractReviewResult, ContractReviewRun } from "@/types/contracts";

export type StepState = "pending" | "running" | "completed" | "failed";
export type TimelineInput = {
  review?: ContractReviewRun | null;
  result?: ContractReviewResult | null;
  uploading?: boolean;
  reviewing?: boolean;
  loadingResult?: boolean;
  reconnecting?: boolean;
  error?: string;
  failureKind?: "load" | "run";
};

export function buildReviewTimeline(input: TimelineInput) {
  const { review, result, uploading, reviewing, loadingResult, error, failureKind } = input;
  const version = result?.contract.currentVersion;
  const taskState = (key: "segmentation" | "summary" | "riskDetection"): StepState => {
    if (review?.status === "completed") return "completed";
    const state = review?.stages?.[key] ?? version?.[`${key}Status`];
    if (state === "running" || state === "completed" || state === "failed") return state;
    if (!review?.stages && review?.status === "running" && review.currentStage === (key === "riskDetection" ? "risk_detection" : key)) return "running";
    if (!review?.stages && key === "segmentation" && (review?.currentStage === "summary" || review?.currentStage === "risk_detection")) return "completed";
    return "pending";
  };
  const segmentation = taskState("segmentation");
  const summary = taskState("summary");
  const risk = taskState("riskDetection");
  // Extraction has no per-review stage field. A later stage proves it finished.
  let reading: StepState = "pending";
  if (review?.status === "completed" || version?.extractionStatus === "completed" || segmentation !== "pending" || summary !== "pending" || risk !== "pending") reading = "completed";
  else if (version?.extractionStatus === "failed" || version?.extractionStatus === "unsupported") reading = "failed";
  else if (review?.status === "running" && review.currentStage === "waiting_for_extraction") reading = "running";

  const analysis: StepState = summary === "completed" && risk === "completed" ? "completed"
    : summary === "failed" || risk === "failed" ? "failed"
    : summary === "running" || risk === "running" ? "running" : "pending";
  const downloading = Boolean(loadingResult || (reviewing && review?.status === "completed"));
  const download: StepState = result ? "completed" : downloading ? "running" : error && failureKind === "load" ? "failed" : "pending";
  const interrupted = Boolean(input.reconnecting || review?.status === "failed" || (error && !reviewing && !loadingResult) || (review?.status === "running" && !reviewing));
  const retrying = review?.status === "running" && review.stageDetail === "retrying after an error";
  const pages = review?.currentStage === "waiting_for_extraction" ? review.stageDetail?.match(/^(\d+)\/(\d+) pages$/) : null;
  let message = "Bắt đầu rà soát để theo dõi tiến trình.";
  if (uploading) message = "Đang tải tệp lên hệ thống…";
  else if (result) message = "Kết quả đã được tải để xem.";
  else if (downloading) message = review?.status === "completed" ? "AI đã xử lý xong. Đang tải kết quả…" : "Đang tải kết quả đã lưu…";
  else if (error && failureKind === "load") message = "Chưa tải được kết quả đã lưu.";
  else if (review?.status === "failed") message = "Lượt rà soát đã thất bại.";
  else if (input.reconnecting) message = "Đang kết nối lại. Giữ trạng thái được cập nhật lần cuối.";
  else if (error || interrupted) message = "Chưa cập nhật được tiến trình. Yêu cầu rà soát vẫn được lưu.";
  else if (review?.status === "queued") message = "Đang chờ đến lượt xử lý…";
  else if (retrying) message = "Hệ thống đang thử lại bước xử lý gặp lỗi…";
  else if (reading === "running") message = "Đang đọc nội dung tài liệu…";
  else if (segmentation === "running") message = "Đang phân tách điều khoản…";
  else if (summary === "running" && risk === "running") message = "Đang tóm tắt và đánh giá rủi ro song song…";
  else if (summary === "running") message = "Đang tóm tắt hợp đồng…";
  else if (risk === "running") message = "Đang đánh giá rủi ro…";
  else if (reviewing) message = "Đang lấy trạng thái lượt rà soát…";
  return {
    message, interrupted, retrying,
    steps: [
      { key: "reading", label: "Đọc tài liệu", description: pages ? `Đã đọc ${pages[1]}/${pages[2]} trang` : "Trích xuất nội dung hợp đồng", state: reading },
      { key: "segmentation", label: "Phân tách điều khoản", description: "Xác định các phần của hợp đồng", state: segmentation },
      { key: "analysis", label: "Phân tích hợp đồng", description: "Hai tác vụ có thể chạy song song", state: analysis },
      { key: "download", label: "Tải kết quả", description: "Lấy kết quả đã lưu, không chạy AI mới", state: download },
      { key: "finished", label: "Hoàn thành", description: "Kết quả sẵn sàng để xem", state: result ? "completed" as const : "pending" as const },
    ],
    tasks: [{ label: "Tóm tắt", state: summary }, { label: "Đánh giá rủi ro", state: risk }],
  };
}

export function reviewElapsed(review: ContractReviewRun | null | undefined, now: number) {
  if (!review?.startedAt) return null;
  const start = Date.parse(review.startedAt);
  const end = review.finishedAt ? Date.parse(review.finishedAt) : now;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const seconds = Math.floor((end - start) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
