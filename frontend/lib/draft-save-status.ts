import type { ContractDraft } from "@/types/contract-drafts";

type SaveStatusInput = {
  busy: string;
  dirty: boolean;
  error: string;
  draft: Pick<ContractDraft, "updatedAt">;
};

export function draftSaveStatus({
  busy,
  dirty,
  error,
  draft,
}: SaveStatusInput) {
  if (busy === "save") {
    return {
      label: "Đang lưu…",
      header: "Đang lưu…",
      message: "Đang lưu thông tin của bạn…",
      tone: "text-slate-500",
    };
  }
  if (dirty) {
    return {
      label: "Lưu thay đổi",
      header: "Có thay đổi chưa lưu",
      message: error
        ? "Thay đổi chưa được lưu. Vui lòng kiểm tra lỗi và thử lại."
        : "Có thay đổi chưa lưu. Hệ thống sẽ tự động lưu sau khi bạn ngừng nhập.",
      tone: error ? "text-red-600" : "text-slate-500",
    };
  }
  return {
    label: "Đã lưu",
    header: `Đã lưu lúc ${new Date(draft.updatedAt).toLocaleTimeString("vi-VN")}`,
    message: "Mọi thay đổi đã được lưu.",
    tone: "text-emerald-700",
  };
}
