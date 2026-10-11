import type { DashboardContract } from "@/types/contracts";
import { Icon } from "@/components/ui/icon";
import styles from "./member-insights.module.css";

export function MemberContractCards({ contracts, onReview, isReviewing, highlightId }: {
  contracts: DashboardContract[];
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  highlightId?: string;
}) {
  const statuses = { uploaded: "Chờ rà soát", processing: "AI đang xử lý", reviewed: "AI đã phân tích", archived: "Lưu trữ" };
  const risks = { high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp", none: "Chưa đánh giá" };
  return <ul className={styles.contractCards}>{contracts.map((contract) => {
    const date = new Date(contract.updatedAt);
    const disabled = !Boolean(contract.id ?? contract._id) || isReviewing || contract.status === "processing" || contract.status === "archived";
    return <li key={contract.id ?? contract._id ?? contract.title} className={highlightId && highlightId === (contract.id ?? contract._id) ? styles.newContract : undefined}>
      <div className={styles.cardTitle}><Icon name="document" /><strong>{contract.title}</strong></div>
      {highlightId && highlightId === (contract.id ?? contract._id) && <span className={styles.newLabel}>Vừa tải lên</span>}
      <div className={styles.badges}><span>{statuses[contract.status]}</span><span className={contract.overallRiskLevel === "high" ? styles.high : contract.overallRiskLevel === "medium" ? styles.medium : ""}>{risks[contract.overallRiskLevel]}</span></div>
      <div className={styles.cardFooter}><time dateTime={contract.updatedAt}>{Number.isNaN(date.getTime()) ? "Chưa rõ ngày cập nhật" : date.toLocaleDateString("vi-VN")}</time><button type="button" onClick={() => onReview(contract)} disabled={disabled}>{contract.status === "reviewed" ? "Xem kết quả" : contract.status === "processing" ? "Đang xử lý" : contract.status === "archived" ? "Đã lưu trữ" : "Rà soát"}<Icon name="arrow" /></button></div>
    </li>;
  })}</ul>;
}
