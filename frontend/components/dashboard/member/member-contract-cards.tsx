import type { DashboardContract } from "@/types/contracts";
import { Icon } from "@/components/ui/icon";

export function MemberContractCards({ contracts, onReview, isReviewing, highlightId }: {
  contracts: DashboardContract[];
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  highlightId?: string;
}) {
  const statuses = { uploaded: "Chờ rà soát", processing: "AI đang xử lý", reviewed: "AI đã phân tích", archived: "Lưu trữ" };
  const risks = { high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp", none: "Chưa đánh giá" };
  return <ul className={"grid gap-[12px] p-[0] m-[18px_0_0] list-none [&_>_li]:[border:1px_solid_#e4ebf5] [&_>_li]:rounded-[12px] [&_>_li]:p-[16px] [&_>_li]:[background:#fbfcff] [&_>_.tw-member-insights-newContract]:[background:#effaf5]! [&_>_.tw-member-insights-newContract]:shadow-[inset_3px_0_#20a078]"}>{contracts.map((contract) => {
    const date = new Date(contract.updatedAt);
    const disabled = !Boolean(contract.id ?? contract._id) || isReviewing || contract.status === "archived";
    return <li key={contract.id ?? contract._id ?? contract.title} className={highlightId && highlightId === (contract.id ?? contract._id) ? "tw-member-insights-newContract [background:#effaf5]! shadow-[inset_3px_0_#20a078]" : undefined}>
      <div className={"flex gap-[10px] items-start [&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:flex-none [&_svg]:text-[#245bd6] [&_strong]:wrap-anywhere [&_strong]:text-[14px] [&_strong]:font-semibold [&_strong]:leading-[1.5]"}><Icon name="document" /><strong>{contract.title}</strong></div>
      {highlightId && highlightId === (contract.id ?? contract._id) && <span className={"inline-flex mt-[10px] p-[4px_8px] rounded-[6px] [background:#dff3e9] text-[#176747] text-[11px] font-bold"}>Vừa tải lên</span>}
      <div className={"flex flex-wrap gap-[7px] mt-[12px] [&_span]:rounded-[6px] [&_span]:[background:#edf2f8] [&_span]:text-[#536881] [&_span]:p-[5px_8px] [&_span]:text-[12px] [&_span]:font-semibold [&_.tw-member-insights-high]:[background:#fff0f2] [&_.tw-member-insights-high]:text-[#a83248] [&_.tw-member-insights-medium]:[background:#fff4dc] [&_.tw-member-insights-medium]:text-[#875c08]"}><span>{statuses[contract.status]}</span><span className={contract.overallRiskLevel === "high" ? "tw-member-insights-high" : contract.overallRiskLevel === "medium" ? "tw-member-insights-medium" : ""}>{risks[contract.overallRiskLevel]}</span></div>
      <div className={"flex flex-wrap items-center justify-between gap-[10px] mt-[13px] [&_time]:text-[12px] [&_time]:text-[#708099] [&_button]:inline-flex [&_button]:min-h-[38px] [&_button]:items-center [&_button]:gap-[7px] [&_button]:[border:1px_solid_#d1def5] [&_button]:rounded-[8px] [&_button]:[background:#f1f6ff] [&_button]:text-[#245bd6] [&_button]:p-[7px_12px] [&_button]:text-[12px] [&_button]:font-semibold [&_button]:cursor-pointer [&_button:disabled]:opacity-[.55] [&_button:disabled]:cursor-default [&_svg]:w-[15px] [&_svg]:h-[15px]"}><time dateTime={contract.updatedAt}>{Number.isNaN(date.getTime()) ? "Chưa rõ ngày cập nhật" : date.toLocaleDateString("vi-VN")}</time><button type="button" onClick={() => onReview(contract)} disabled={disabled}>{contract.status === "reviewed" ? "Xem kết quả" : contract.status === "processing" ? "Theo dõi xử lý" : contract.status === "archived" ? "Đã lưu trữ" : "Rà soát"}<Icon name="arrow" /></button></div>
    </li>;
  })}</ul>;
}
