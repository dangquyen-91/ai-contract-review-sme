import type { DashboardContract } from "@/types/contracts";

export function contractTrackingUpdate(contract: DashboardContract) {
  const verification = contract.expertVerification;
  if (!verification) return { label: "Hợp đồng cập nhật", at: contract.updatedAt };
  const previous = verification.reviewId !== contract.latestReviewId ? " (lượt trước)" : "";
  if (verification.status === "approved") return { label: `Chuyên gia hoàn tất${previous}`, at: verification.completedAt };
  if (verification.status === "returned") return { label: `Chuyên gia trả lại${previous}`, at: verification.completedAt };
  if (verification.status === "in_progress") return { label: `Chuyên gia tiếp nhận${previous}`, at: verification.assignedAt };
  return { label: `Đã gửi yêu cầu${previous}`, at: verification.requestedAt };
}
