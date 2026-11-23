import { Archive, CircleCheck, ScanLine, Undo2 } from "lucide-react";
import { VerificationStatusCards } from "./verification-status-cards";
import type { ExpertWorkStatus } from "@/types/expert-work";

const groups = [
  {
    value: "all",
    label: "Tất cả",
    description: "Các lần xác minh bạn đã tiếp nhận",
    icon: Archive,
  },
  {
    value: "in_progress",
    label: "Đang xử lý",
    description: "Tiếp tục kiểm tra và đối chiếu hợp đồng",
    icon: ScanLine,
  },
  {
    value: "approved",
    label: "Đã hoàn tất",
    description: "Xem lại kết quả và kết luận đã lưu",
    icon: CircleCheck,
  },
  {
    value: "returned",
    label: "Đã trả lại",
    description: "Theo dõi lý do và các lần trả yêu cầu",
    icon: Undo2,
  },
] as const;

export function MyWorkStatus({
  value,
  onChange,
}: {
  value: ExpertWorkStatus;
  onChange: (value: ExpertWorkStatus) => void;
}) {
  return (
    <VerificationStatusCards
      value={value}
      onChange={onChange}
      items={groups}
      label="Trạng thái công việc"
    />
  );
}
