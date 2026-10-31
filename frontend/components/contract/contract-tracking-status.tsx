import { Badge } from "@/components/ui/badge";
import { contractStatusLabels, contractStatusTones } from "@/config/contract-display";
import type { DashboardContract } from "@/types/contracts";

export const trackingPresentation = {
  requested: { label: "Chờ chuyên gia tiếp nhận", tone: "border-blue-200 bg-blue-50 text-blue-900", detail: "Yêu cầu đã được gửi. Chuyên gia chưa tiếp nhận." },
  in_progress: { label: "Chuyên gia đang kiểm tra", tone: "border-blue-200 bg-blue-50 text-blue-900", detail: "Chuyên gia đã tiếp nhận và đang kiểm tra hợp đồng." },
  approved: { label: "Đã được chuyên gia kiểm tra", tone: "border-emerald-200 bg-emerald-50 text-emerald-900", detail: "Chuyên gia đã hoàn tất kiểm tra. Mở kết quả để xem các điểm cần lưu ý." },
  returned: { label: "Chuyên gia đã trả lại", tone: "border-amber-300 bg-amber-50 text-amber-950", detail: "Yêu cầu đã được trả lại. Xem lý do trước khi gửi lại." },
};

export function ContractTrackingStatus({ contract, oldReview }: { contract: DashboardContract; oldReview: boolean }) {
  const verification = contract.expertVerification;
  if (!verification) return (
    <Badge variant={contractStatusTones[contract.status]}>
      {contractStatusLabels[contract.status]}
      {contract.status === "processing" && <span aria-hidden="true" className="ml-1 size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />}
    </Badge>
  );
  const presentation = trackingPresentation[verification.status];
  const open = verification.status === "requested" || verification.status === "in_progress";
  return (
    <span key={`${verification._id}:${verification.status}`} aria-label={`Trạng thái chuyên gia: ${presentation.label}${oldReview ? ", lượt trước" : ""}`}
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-ui-meta font-semibold animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none ${presentation.tone}`}>
      {open && <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none" />}
      <span>{presentation.label}{oldReview ? " · Lượt trước" : ""}</span>
    </span>
  );
}
