import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import styles from "@/app/(auth)/auth.module.css";

function ReviewAnnotationCard({ tone, title, children }: { tone: "warning" | "suggestion"; title: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.annotationCard} ${tone === "warning" ? styles.annotationWarning : styles.annotationSuggestion}`}>
      <span><Icon name={tone === "warning" ? "search" : "check"} /></span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  );
}

function ContractPreview() {
  return (
    <div className={styles.loginContractScene} aria-hidden="true">
      <div className={`${styles.contractLayer} ${styles.contractLayerBack}`} />
      <div className={`${styles.contractLayer} ${styles.contractLayerMiddle}`} />
      <article className={styles.loginContractPaper}>
        <header><strong>HỢP ĐỒNG DỊCH VỤ</strong><span>Minh họa</span></header>
        <section><small>1. Phạm vi công việc</small><i /><i /><i /></section>
        <section className={styles.contractWarning}><small>2. Thanh toán và thời hạn</small><i /><i /><i /></section>
        <section className={styles.contractSuggestion}><small>3. Quyền và nghĩa vụ của các bên</small><i /><i /><i /></section>
        <footer><i /><i /></footer>
      </article>
      <div className={styles.warningConnector} />
      <div className={styles.suggestionConnector} />
      <div className={styles.loginWarningCard}>
        <ReviewAnnotationCard tone="warning" title="Điểm cần xem xét">Thời hạn thanh toán chưa rõ.</ReviewAnnotationCard>
      </div>
      <div className={styles.loginSuggestionCard}>
        <ReviewAnnotationCard tone="suggestion" title="Gợi ý chỉnh sửa">Bổ sung thời hạn và điều kiện thanh toán.</ReviewAnnotationCard>
      </div>
      <div className={styles.sourceLabel}><Icon name="scales" /><span>Nguồn tham chiếu</span></div>
    </div>
  );
}

function ReviewSteps() {
  const steps = [
    { icon: "upload" as const, label: "Tải hợp đồng" },
    { icon: "sparkle" as const, label: "AI phân tích" },
    { icon: "document" as const, label: "Bạn rà soát" },
  ];
  return (
    <div className={styles.loginReviewSteps} aria-hidden="true">
      <div className={styles.loginStepRow}>
        {steps.map((step, index) => (
          <div className={styles.loginStep} key={step.label}>
            <span><Icon name={step.icon} /></span><strong>{step.label}</strong>
            {index < steps.length - 1 && <i />}
          </div>
        ))}
      </div>
      <p>Bạn quyết định sau khi xem xét gợi ý.</p>
    </div>
  );
}

export function AuthBrandPanel() {
  return (
    <div className={styles.loginBrandPanel}>
      <Link className={styles.brand} href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
      <div className={styles.loginBrandCopy}>
        <h2><span>Rõ từng điều khoản.</span><span>Vững mỗi quyết định.</span></h2>
        <p>Rà soát hợp đồng với giải thích rõ ràng và nguồn tham chiếu.</p>
      </div>
      <ContractPreview />
      <ReviewSteps />
    </div>
  );
}
