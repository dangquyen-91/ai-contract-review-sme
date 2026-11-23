import { Check, FilePenLine, Plus, Trash2, X } from "lucide-react";
import type { VerificationAction } from "@/types/verification-workspace";

export const verificationHistoryActions = {
  confirm: {
    label: "Xác nhận vấn đề",
    icon: Check,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  adjust: {
    label: "Điều chỉnh vấn đề",
    icon: FilePenLine,
    tone: "border-blue-100 bg-blue-50 text-blue-700",
  },
  reject: {
    label: "Bác bỏ vấn đề",
    icon: X,
    tone: "border-rose-100 bg-rose-50 text-rose-700",
  },
  add: {
    label: "Bổ sung vấn đề",
    icon: Plus,
    tone: "border-violet-100 bg-violet-50 text-violet-700",
  },
  remove: {
    label: "Xóa vấn đề bổ sung",
    icon: Trash2,
    tone: "border-amber-100 bg-amber-50 text-amber-700",
  },
} satisfies Record<
  VerificationAction["action"],
  { label: string; icon: typeof Check; tone: string }
>;
