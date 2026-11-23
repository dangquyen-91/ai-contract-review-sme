import { Files, Inbox, ScanLine } from "lucide-react";
import { VerificationStatusCards } from "./verification-status-cards";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

const groups = [
  {
    value: "all",
    label: "Tất cả",
    description: "Yêu cầu chờ tiếp nhận và công việc của bạn",
    icon: Files,
  },
  {
    value: "requested",
    label: "Chờ tiếp nhận",
    description: "Xem yêu cầu mới và bắt đầu xác minh",
    icon: Inbox,
  },
  {
    value: "in_progress",
    label: "Tôi đang xử lý",
    description: "Tiếp tục các hợp đồng bạn đã tiếp nhận",
    icon: ScanLine,
  },
] as const;

export function VerificationQueueStatus({
  value,
  onChange,
}: {
  value: VerificationQueueFilter;
  onChange: (value: VerificationQueueFilter) => void;
}) {
  return (
    <VerificationStatusCards
      value={value}
      onChange={onChange}
      items={groups}
      label="Lọc yêu cầu xác minh"
    />
  );
}
