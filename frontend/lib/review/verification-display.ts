export const verificationStatuses = {
  requested: { label: "Đang chờ chuyên gia tiếp nhận", tone: "border-blue-200 bg-blue-50 text-blue-950" },
  in_progress: { label: "Chuyên gia đang kiểm tra", tone: "border-blue-200 bg-blue-50 text-blue-950" },
  approved: { label: "Đã được chuyên gia kiểm tra", tone: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  returned: { label: "Chuyên gia đã trả lại yêu cầu", tone: "border-amber-200 bg-amber-50 text-amber-950" },
};

export function verificationDate(value?: string) {
  if (!value) return "Chưa có thời gian";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (GMT+7)`
    : "Chưa có thời gian";
}
