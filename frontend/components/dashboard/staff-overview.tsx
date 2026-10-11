import { Icon } from "@/components/ui/icon";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardData } from "@/types/dashboard";
import styles from "./staff-overview.module.css";

const contractTypes: Record<string, string> = {
  sales: "Mua bán hàng hóa",
  service: "Cung ứng dịch vụ",
  saas: "Dịch vụ phần mềm",
  office_lease: "Thuê văn phòng, mặt bằng",
  labor: "Hợp đồng lao động",
  housing_purchase: "Mua bán nhà ở",
  life_insurance: "Bảo hiểm nhân thọ",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa rõ"
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function priority(contract: DashboardContract) {
  if (contract.overallRiskLevel === "high") return 0;
  if (contract.status === "uploaded") return 1;
  if (contract.status === "processing") return 2;
  return 3;
}

export function StaffOverview({
  data,
  onUpload,
  onViewContracts,
  onReview,
  isReviewing,
}: {
  data: DashboardData;
  onUpload: () => void;
  onViewContracts: () => void;
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
}) {
  const recent = [...data.contracts]
    .filter((contract) => contract.status !== "archived")
    .sort((left, right) => priority(left) - priority(right))
    .slice(0, 4);
  const firstName = data.user?.name?.trim().split(/\s+/).at(-1);
  const overview = [
    { label: "Hợp đồng", value: data.totalContracts, icon: "document" as const, tone: "blue" },
    { label: "Đang xử lý", value: data.stats.processing, icon: "sparkle" as const, tone: "amber" },
    { label: "Rủi ro cao", value: data.stats.highRisk, icon: "shield" as const, tone: "rose" },
  ];

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero} aria-labelledby="staff-heading">
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Không gian nhân viên · {data.organization.name}</span>
          <h1 id="staff-heading">{firstName ? `Chào ${firstName}, bắt đầu công việc hôm nay.` : "Bắt đầu công việc hôm nay."}</h1>
          <p>Tải hợp đồng, theo dõi kết quả rà soát và ưu tiên những rủi ro cần xem xét.</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={onUpload}>
              <Icon name="upload" className={styles.actionIcon} /> Tải hợp đồng mới
            </button>
            <button type="button" className={styles.secondaryAction} onClick={onViewContracts}>
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

      <section className={styles.metrics} aria-label="Tình trạng hợp đồng của tổ chức">
        {overview.map((item) => (
          <article className={`${styles.metric} ${styles[item.tone]}`} key={item.label}>
            <span className={styles.metricIcon}><Icon name={item.icon} /></span>
            <div><p>{item.label}</p><strong>{item.value.toLocaleString("vi-VN")}</strong></div>
          </article>
        ))}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.priorityCard} aria-labelledby="staff-priority-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="staff-priority-heading">Hợp đồng gần đây</h2>
              <p>Rủi ro cao được đưa lên đầu danh sách.</p>
            </div>
            <button type="button" onClick={onViewContracts}>Xem tất cả <Icon name="arrow" /></button>
          </div>
          {recent.length ? (
            <ul className={styles.contractList}>
              {recent.map((contract) => {
                const id = contract.id ?? contract._id;
                const highRisk = contract.overallRiskLevel === "high";
                const status = highRisk ? "Rủi ro cao" : contract.status === "uploaded" ? "Chờ rà soát" : contract.status === "processing" ? "Đang xử lý" : "Đã rà soát";
                return (
                  <li key={id ?? `${contract.title}-${contract.updatedAt}`} className={styles.contractRow}>
                    <span className={styles.contractIcon}><Icon name="document" /></span>
                    <div className={styles.contractInfo}>
                      <strong>{contract.title}</strong>
                      <span>{contractTypes[contract.type] ?? contract.type} · {formatDate(contract.updatedAt)}</span>
                    </div>
                    <span className={`${styles.status} ${highRisk ? styles.statusHigh : contract.status === "processing" ? styles.statusProcessing : styles.statusNormal}`}>{status}</span>
                    {id && contract.status !== "processing" && (
                      <button className={styles.reviewAction} type="button" onClick={() => onReview(contract)} disabled={isReviewing}>
                        {contract.status === "reviewed" ? "Xem kết quả" : "Rà soát"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <span><Icon name="document" /></span>
              <h3>Chưa có hợp đồng nào</h3>
              <p>Tải hợp đồng đầu tiên để bắt đầu rà soát.</p>
              <button type="button" onClick={onUpload}>Tải hợp đồng <Icon name="arrow" /></button>
            </div>
          )}
        </section>

        <aside className={styles.sideCard} aria-labelledby="staff-progress-heading">
          <div className={styles.sideIcon}><Icon name="chart" /></div>
          <h2 id="staff-progress-heading">Tiến độ rà soát</h2>
          <p>Theo dõi tình trạng hợp đồng trong tổ chức.</p>
          <div className={styles.progressFigure}>
            <strong>{data.stats.reviewed.toLocaleString("vi-VN")}</strong>
            <span>hợp đồng đã rà soát</span>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuenow={data.stats.reviewed} aria-valuemin={0} aria-valuemax={Math.max(1, data.totalContracts)} aria-label="Hợp đồng đã rà soát">
            <span style={{ width: `${data.totalContracts ? Math.min(100, data.stats.reviewed / data.totalContracts * 100) : 0}%` }} />
          </div>
          <div className={styles.progressLegend}><span>Đã rà soát</span><strong>{data.totalContracts ? Math.round(data.stats.reviewed / data.totalContracts * 100) : 0}%</strong></div>
          <div className={styles.sideNote}><Icon name="shield" /><span>Các rủi ro cao cần được kiểm tra trước khi dùng kết quả để trao đổi với đối tác.</span></div>
        </aside>
      </div>
    </div>
  );
}
