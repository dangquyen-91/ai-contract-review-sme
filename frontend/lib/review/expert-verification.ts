import { isApiClientError } from "@/lib/api/client";
import type { ContractReviewRun } from "@/types/contracts";

export function latestVerifiableRun(runs: ContractReviewRun[], versionId?: string) {
  // The API orders runs newest first. Never offer an older completed run
  // while a newer run is queued, running, failed, or cancelled.
  const latest = runs[0];
  return latest?.status === "completed" && latest.result && !latest.result.partial && (!versionId || latest.versionId === versionId) ? latest : undefined;
}

export function verificationErrorMessage(error: unknown) {
  if (!isApiClientError(error)) return "Chưa xử lý được yêu cầu. Vui lòng thử lại.";
  const messages: Record<string, string> = {
    NO_EXPERT: "Hiện chưa có chuyên gia LawScan nhận xác minh. Bạn có thể thử lại sau.",
    REVIEW_NOT_VERIFIABLE: "AI cần hoàn tất đầy đủ trước khi gửi chuyên gia kiểm tra.",
    REVIEW_OUTDATED: "Kết quả này không còn là bản mới nhất. Hãy mở lại kết quả mới rồi gửi yêu cầu.",
    REVIEW_RUNNING: "Hợp đồng đang được rà soát lại. Hãy chờ hoàn tất trước khi gửi yêu cầu.",
    VERIFICATION_EXISTS: "Kết quả này đã được gửi xác minh. Trạng thái đang được cập nhật.",
    VERIFICATION_IN_PROGRESS: "Kết quả đang được chuyên gia kiểm tra. Hãy chờ yêu cầu kết thúc trước khi rà soát lại.",
  };
  return (error.serverCode && messages[error.serverCode]) || error.message;
}
