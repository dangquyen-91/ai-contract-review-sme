import { PricingPlans } from "./pricing-plans";
import styles from "./pricing-section.module.css";

export function PricingSection() {
  return (
    <section id="goi-dich-vu" className={styles.section} aria-labelledby="pricing-heading">
      <div className={`ls-container ${styles.container}`}>
        <div className={styles.heading} data-reveal>
          <p className={`section-eyebrow ${styles.eyebrow}`}>07 / Gói dịch vụ</p>
          <h2 id="pricing-heading">Chọn gói phù hợp.<br /><span>Chủ động mỗi lần ký.</span></h2>
          <p>Bắt đầu với bản mẫu, mở rộng khi đội ngũ của bạn cần thêm.</p>
        </div>
        <PricingPlans />
        <p className={styles.disclaimer}>
          Giá và hạn mức minh họa. LawScan chưa mở đăng ký gói hoặc thanh toán.
        </p>
      </div>
    </section>
  );
}
