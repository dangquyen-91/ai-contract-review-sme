import { Icon } from "@/components/ui/icon";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter, DashboardData } from "@/types/dashboard";
import { MemberContractChart } from "./member-contract-chart";
import insights from "./member-insights.module.css";
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
  const recent = [...data.contracts]
    .filter((contract) => contract.status !== "archived")
    .filter((contract) => reviewerMode || contract.status === "uploaded" || contract.status === "processing")
    .sort((left, right) => reviewerMode ? priority(left) - priority(right) : (left.status === "uploaded" ? -1 : left.status === "processing" ? 0 : 1) - (right.status === "uploaded" ? -1 : right.status === "processing" ? 0 : 1))
    .slice(0, 4);
  const firstName = data.user?.name?.trim().split(/\s+/).at(-1);
  const nextContract = recent.find((contract) => (contract.id ?? contract._id) && contract.status !== "processing");
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
          <h1 id={headingId}>{reviewerMode ? (firstName ? `Chào ${firstName}, cùng kiểm tra những rủi ro cần lưu ý.` : "Kiểm tra những rủi ro cần lưu ý.") : (firstName ? `Chào ${firstName}, bắt đầu công việc hôm nay.` : "Bắt đầu công việc hôm nay.")}</h1>
          <p>{reviewerMode ? "Xem kết quả AI, đối chiếu căn cứ pháp lý và chỉnh sửa đề xuất cho hợp đồng của tổ chức." : "Tải hợp đồng, theo dõi kết quả rà soát và ưu tiên những rủi ro cần xem xét."}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryAction} onClick={reviewerMode ? () => nextContract ? onReview(nextContract) : onViewContracts() : onUpload} disabled={reviewerMode && isReviewing}>
              <Icon name={reviewerMode ? "shield" : "upload"} className={styles.actionIcon} /> {reviewerMode ? (nextContract ? "Mở hợp đồng ưu tiên" : "Xem danh sách hợp đồng") : "Tải hợp đồng mới"}
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
        <MemberContractChart data={data} reviewerMode={reviewerMode} onFilter={onViewContracts} />
        <section className={styles.priorityCard} aria-labelledby="staff-priority-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="staff-priority-heading">{reviewerMode ? "Ưu tiên kiểm tra" : "Cần xử lý gần đây"}</h2>
              <p>{reviewerMode ? "Trong các hợp đồng gần đây của tổ chức · ưu tiên rủi ro cao." : "Ưu tiên hợp đồng chờ rà soát trong các tài liệu gần đây."}</p>
            </div>
            <button type="button" onClick={() => onViewContracts()}>Xem tất cả <Icon name="arrow" /></button>
          </div>
          {recent.length ? (
            <ul className={styles.contractList}>
              {recent.map((contract) => {
                const id = contract.id ?? contract._id;
                const highRisk = contract.overallRiskLevel === "high";
                const failed = contract.currentVersion?.extractionStatus === "failed" || contract.currentVersion?.riskDetectionStatus === "failed" || contract.currentVersion?.summaryStatus === "failed" || contract.currentVersion?.segmentationStatus === "failed";
                const status = contract.status === "processing" ? "Đang xử lý" : failed ? "Cần thử lại" : highRisk ? "Rủi ro cao" : contract.status === "uploaded" ? "Chờ rà soát" : "Đã rà soát";
                return (
                  <li key={id ?? `${contract.title}-${contract.updatedAt}`} className={styles.contractRow}>
                    <span className={styles.contractIcon}><Icon name="document" /></span>
                    <div className={styles.contractInfo}>
                      <strong>{contract.title}</strong>
                      <span>{contractTypes[contract.type] ?? contract.type} · {formatDate(contract.updatedAt)}</span>
                    </div>
                    <span className={`${styles.status} ${contract.status === "processing" ? styles.statusProcessing : highRisk || failed ? styles.statusHigh : styles.statusNormal}`}>{status}</span>
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
              <h3>{data.totalContracts ? "Không có hợp đồng cần xử lý trong danh sách gần đây" : "Chưa có hợp đồng nào"}</h3>
              <p>{data.totalContracts ? "Bạn có thể xem toàn bộ hợp đồng bằng bộ lọc ở trên." : reviewerMode ? "Hợp đồng do Owner, Manager hoặc Staff tải lên sẽ xuất hiện tại đây." : "Tải hợp đồng đầu tiên để bắt đầu rà soát."}</p>
              {!reviewerMode && <button type="button" onClick={onUpload}>Tải hợp đồng <Icon name="arrow" /></button>}
            </div>
          )}
        </section>

      </div>
      {!reviewerMode && onQuickUpload && <section className={insights.quickUpload} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) onQuickUpload(file); }}>
        <h2>Tải hợp đồng nhanh</h2>
        <p>Kéo thả tài liệu vào đây hoặc chọn tệp. Bạn sẽ kiểm tra thông tin trước khi tải lên.</p>
        <label><Icon name="upload" />Chọn tài liệu<input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) onQuickUpload(file); event.target.value = ""; }} /></label>
        <p>PDF, DOCX, PNG, JPG · Tối đa 20 MB</p>
      </section>}

    </div>
  );
}
