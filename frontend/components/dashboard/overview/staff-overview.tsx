import { QuickContractUpload } from "../member/quick-contract-upload";
import { Icon } from "@/components/ui/icon";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";
import { MemberPriorityQueue } from "../member/member-priority-queue";
import { MemberContractChart } from "../member/member-contract-chart";
import insights from "../member/member-insights.module.css";
import styles from "./staff-overview.module.css";

export function StaffOverview({
  data,
  onUpload,
  onViewContracts,
  onReview,
  isReviewing,
  reviewerMode = false,
  onQuickUpload,
}: {
  data: DashboardData;
  onUpload: () => void;
  onViewContracts: (filter?: DashboardContractFilter) => void;
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  reviewerMode?: boolean;
  onQuickUpload?: (file: File) => void;
}) {
  const headingId = reviewerMode ? "reviewer-heading" : "staff-heading";
  const overview = reviewerMode ? [
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
    { label: "Đã rà soát bằng AI", value: data.stats.reviewed, icon: "check" as const, tone: "blue" },
    { label: "AI đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "amber" },
  ] : [
    { label: "Hợp đồng", value: data.totalContracts, icon: "document" as const, tone: "blue" },
    { label: "Đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "amber" },
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
  ];

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero} aria-labelledby={headingId}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{reviewerMode ? "Không gian chuyên viên rà soát" : "Không gian nhân viên"} · {data.organization.name}</span>
          <h1 id={headingId}>{reviewerMode ? "Kiểm tra rủi ro hợp đồng" : "Không gian làm việc"}</h1>
          <p>{reviewerMode ? "Xem kết quả AI, đối chiếu căn cứ pháp lý và chỉnh sửa đề xuất cho hợp đồng của tổ chức." : "Tải hợp đồng, theo dõi kết quả rà soát và ưu tiên những rủi ro cần xem xét."}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={reviewerMode ? () => onViewContracts({ riskLevel: "high", status: "reviewed" }) : onUpload} disabled={reviewerMode && isReviewing}>
              <Icon name={reviewerMode ? "shield" : "upload"} className={styles.actionIcon} /> {reviewerMode ? "Kiểm tra rủi ro cao" : "Tải hợp đồng mới"}
            </button>
            <button type="button" className={styles.secondaryAction} onClick={() => onViewContracts()}>
              Xem hợp đồng <Icon name="arrow" className={styles.actionIcon} />
            </button>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <span className={styles.visualRing} />
          <div className={styles.visualSheet}>
            <Icon name="document" />
            <span /><span /><span />
            <div className={styles.visualSeal}><Icon name="check" /></div>
          </div>
        </div>
      </section>

      {!reviewerMode && onQuickUpload && <QuickContractUpload onSelect={onQuickUpload} />}
      <section className={styles.metrics} aria-label="Tình trạng hợp đồng của tổ chức">
        {overview.map((item) => (
          <article className={`${styles.metric} ${styles[item.tone]}`} key={item.label}>
            <span className={styles.metricIcon}><Icon name={item.icon} /></span>
            <div><p>{item.label}</p><strong>{item.value.toLocaleString("vi-VN")}</strong></div>
          </article>
        ))}
      </section>

      <div className={insights.filters} aria-label="Lọc nhanh hợp đồng">
        {reviewerMode ? <>
          <button type="button" onClick={() => onViewContracts({ riskLevel: "high" })}>Rủi ro cao · {data.stats.highRisk}</button>
          <button type="button" onClick={() => onViewContracts({ status: "reviewed" })}>Đã có kết quả · {data.stats.reviewed}</button>
        </> : <button type="button" onClick={() => onViewContracts({ status: "uploaded" })}>Chờ rà soát · {data.distribution?.statuses.uploaded ?? "—"}</button>}
        <button type="button" onClick={() => onViewContracts({ status: "processing" })}>AI đang xử lý · {data.stats.processing}</button>
      </div>
      <div className={insights.insights}>
        <MemberPriorityQueue orgId={data.organization.id} role={reviewerMode ? "reviewer" : "staff"} onReview={onReview} onViewContracts={onViewContracts} isReviewing={isReviewing} />
        <MemberContractChart data={data} reviewerMode={reviewerMode} onFilter={onViewContracts} />
      </div>


    </div>
  );
}
