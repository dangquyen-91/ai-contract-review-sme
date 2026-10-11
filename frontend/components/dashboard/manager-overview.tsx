import { MemberPriorityQueue } from "./member-priority-queue";
import type { DashboardContract } from "@/types/contracts";
import { Icon } from "@/components/ui/icon";
import { MemberContractChart } from "./member-contract-chart";
import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";
import styles from "./staff-overview.module.css";
import manager from "./manager-overview.module.css";

export function ManagerOverview({ data, onUpload, onViewContracts, onReview, isReviewing }: {
  data: DashboardData;
  onUpload: () => void;
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  onViewContracts: (filter?: DashboardContractFilter) => void;
}) {
  const metrics = [
    { label: "Tổng hợp đồng", value: data.totalContracts, icon: "document" as const, tone: "blue" },
    { label: "Chờ rà soát", value: data.distribution?.statuses.uploaded, icon: "search" as const, tone: "amber" },
    { label: "AI đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "blue" },
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
  ];
  return <div className={styles.dashboard}>
    <section className={styles.hero} aria-labelledby="manager-heading">
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Không gian quản lý · {data.organization.name}</span>
        <h1 id="manager-heading">Tổng quan công việc</h1>
        <p>Theo dõi tình trạng xử lý của tổ chức và những rủi ro cần đội ngũ chú ý.</p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryAction} onClick={() => onViewContracts({ riskLevel: "high" })}><Icon name="shield" className={styles.actionIcon} />Kiểm tra rủi ro cao</button>
          <button type="button" className={styles.secondaryAction} onClick={onUpload}><Icon name="upload" className={styles.actionIcon} />Tải hợp đồng mới</button>
        </div>
      </div>
    </section>
    <section className={`${styles.metrics} ${manager.metrics}`} aria-label="Thống kê hợp đồng toàn tổ chức">
      {metrics.map((item) => <button type="button" onClick={() => onViewContracts(item.label === "Chờ rà soát" ? { status: "uploaded" } : item.label === "AI đang xử lý" ? { status: "processing" } : item.label === "Rủi ro cao" ? { riskLevel: "high" } : {})} key={item.label} className={`${styles.metric} ${styles[item.tone]}`}><span className={styles.metricIcon}><Icon name={item.icon} /></span><div><p>{item.label}</p><strong>{item.value?.toLocaleString("vi-VN") ?? "—"}</strong></div></button>)}
    </section>
    <MemberPriorityQueue orgId={data.organization.id} role="manager" onReview={onReview} onViewContracts={onViewContracts} isReviewing={isReviewing} />
    <div className={manager.charts}>
      <MemberContractChart data={data} reviewerMode={false} onFilter={onViewContracts} />
      <MemberContractChart data={data} reviewerMode onFilter={onViewContracts} />
    </div>
    <details className={manager.organization} aria-labelledby="manager-org-heading">
      <summary id="manager-org-heading">Thông tin tổ chức · {data.organization.name}</summary>
      <dl><div><dt>Mã số thuế</dt><dd>{data.organization.taxCode || "Chưa cập nhật"}</dd></div><div><dt>Địa chỉ</dt><dd>{data.organization.address || "Chưa cập nhật"}</dd></div></dl>
      <p className={manager.note}>Thông tin tổ chức và lời mời thành viên do Owner quản lý.</p>
    </details>
  </div>;
}
