"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./pricing-section.module.css";

type BillingCycle = "monthly" | "yearly";
type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  icon: "document" | "sparkle" | "team";
  features: string[];
  featureHeading: string;
  recommended?: boolean;
};

// Illustrative pricing only. No checkout or subscription API is connected.
const plans: Plan[] = [
  {
    id: "free",
    name: "Dùng thử",
    description: "Làm quen với cách LawScan đọc và rà soát hợp đồng.",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    icon: "document",
    featureHeading: "Khám phá trước khi bắt đầu",
    features: [
      "Hợp đồng mẫu có sẵn",
      "3 tình huống điều khoản minh họa",
      "Xem rủi ro và gợi ý làm rõ",
      "Không cần tải tài liệu cá nhân",
    ],
  },
  {
    id: "basic",
    name: "Cơ bản",
    description: "Cho doanh nghiệp nhỏ cần rà soát hợp đồng thường xuyên.",
    monthlyPrice: 299000,
    annualMonthlyPrice: 249000,
    icon: "sparkle",
    recommended: true,
    featureHeading: "Đủ cho công việc hằng ngày",
    features: [
      "30 hợp đồng mỗi tháng",
      "3 thành viên trong doanh nghiệp",
      "Phát hiện rủi ro, gợi ý chỉnh sửa",
      "Giải thích kèm nguồn tham chiếu",
      "Xuất báo cáo rà soát PDF",
    ],
  },
  {
    id: "team",
    name: "Nhóm",
    description: "Cho đội ngũ cùng phối hợp và xử lý nhiều hợp đồng hơn.",
    monthlyPrice: 799000,
    annualMonthlyPrice: 649000,
    icon: "team",
    featureHeading: "Mọi quyền lợi Cơ bản, cộng thêm",
    features: [
      "100 hợp đồng mỗi tháng",
      "10 thành viên trong doanh nghiệp",
      "Hạn mức dùng chung cho đội ngũ",
      "Phân quyền theo vai trò",
      "Theo dõi lịch sử rà soát chung",
    ],
  },
];

const formatPrice = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);
const priceFor = (plan: Plan, cycle: BillingCycle) =>
  cycle === "yearly" ? plan.annualMonthlyPrice : plan.monthlyPrice;

function PlanCard({ plan, cycle, index, onSelect }: {
  plan: Plan;
  cycle: BillingCycle;
  index: number;
  onSelect: (plan: Plan) => void;
}) {
  const isFree = plan.monthlyPrice === 0;
  const price = priceFor(plan, cycle);

  return (
    <article
      className={`${styles.card} ${plan.recommended ? styles.recommended : ""}`}
      aria-labelledby={`plan-${plan.id}`}
      data-reveal
      data-reveal-delay={index * 90}
    >
      <div className={styles.cardHeading}>
        <span className={styles.planIcon}><Icon name={plan.icon} width="22" height="22" /></span>
        <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
        {plan.recommended && <span className={styles.badge}>Đề xuất cho SME</span>}
      </div>
      <p className={styles.description}>{plan.description}</p>

      <div className={styles.priceArea} key={cycle}>
        <p className={styles.price}>
          <span>{formatPrice(price)}</span><sup>đ</sup>
          <span className={styles.pricePeriod}>{isFree ? "/ bản mẫu" : "/ tháng"}</span>
        </p>
        <p className={styles.billingNote}>
          {isFree ? "Trải nghiệm miễn phí, không cần thẻ." : cycle === "yearly"
            ? `${formatPrice(price * 12)}đ / năm, thanh toán một lần.`
            : "Cho cả doanh nghiệp, thanh toán hằng tháng."}
        </p>
      </div>

      {isFree ? (
        <a className={`${styles.planButton} ${styles.secondaryButton}`} href="#minh-hoa">
          Trải nghiệm bản mẫu <Icon name="arrow" width="18" height="18" />
        </a>
      ) : (
        <button
          className={`${styles.planButton} ${plan.recommended ? styles.primaryButton : styles.secondaryButton}`}
          type="button"
          aria-haspopup="dialog"
          onClick={() => onSelect(plan)}
        >
          Xem gói {plan.name} <Icon name="arrow" width="18" height="18" />
        </button>
      )}

      <div className={styles.benefits}>
        <p>{plan.featureHeading}</p>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}><Icon name="check" width="17" height="17" /><span>{feature}</span></li>
          ))}
        </ul>
      </div>
      <p className={styles.cardFootnote}>{isFree ? "Tìm hiểu trước, quyết định sau." : "Quyền lợi và hạn mức dự kiến."}</p>
    </article>
  );
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [activePlan, setActivePlan] = useState<Plan>(plans[1]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activePrice = priceFor(activePlan, cycle);

  function showPlan(plan: Plan) {
    setActivePlan(plan);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <div className={styles.billingControls}>
        <fieldset className={styles.billingSwitch} data-cycle={cycle}>
          <legend className="sr-only">Chu kỳ thanh toán</legend>
          <span className={styles.switchIndicator} aria-hidden="true" />
          {([['monthly', 'Hàng tháng'], ['yearly', 'Hàng năm']] as const).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="billing-cycle"
                value={value}
                checked={cycle === value}
                onChange={() => setCycle(value)}
                className="sr-only"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <span className={styles.yearlyHint}>Trả năm, giá tốt hơn <Icon name="diagonal" width="15" height="15" /></span>
      </div>

      <p className="sr-only" role="status">
        {cycle === "yearly"
          ? "Giá minh họa theo năm: Cơ bản 249.000 đồng mỗi tháng, tổng 2.988.000 đồng mỗi năm. Nhóm 649.000 đồng mỗi tháng, tổng 7.788.000 đồng mỗi năm."
          : "Giá minh họa theo tháng: Cơ bản 299.000 đồng. Nhóm 799.000 đồng."}
      </p>

      <div className={styles.plans}>
        {plans.map((plan, index) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} index={index} onSelect={showPlan} />
        ))}
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="plan-dialog-title" aria-describedby="plan-dialog-description">
        <div className={styles.dialogTop}>
          <span className={styles.dialogLabel}>Gói minh họa</span>
          <button type="button" className={styles.closeButton} aria-label="Đóng thông tin gói" onClick={() => dialogRef.current?.close()}>×</button>
        </div>
        <h2 id="plan-dialog-title">LawScan {activePlan.name}</h2>
        <p id="plan-dialog-description" className={styles.dialogDescription}>
          Đây là thông tin gói dự kiến để bạn tham khảo. Chưa mở đăng ký hoặc thanh toán.
        </p>
        <dl className={styles.dialogSummary}>
          <div><dt>Chu kỳ</dt><dd>{cycle === "yearly" ? "Hằng năm" : "Hằng tháng"}</dd></div>
          <div><dt>Giá mỗi tháng</dt><dd>{formatPrice(activePrice)}đ</dd></div>
          <div><dt>Tổng tiền minh họa</dt><dd>{formatPrice(activePrice * (cycle === "yearly" ? 12 : 1))}đ / {cycle === "yearly" ? "năm" : "tháng"}</dd></div>
        </dl>
        <ul className={styles.dialogFeatures}>
          {activePlan.features.map((feature) => <li key={feature}><Icon name="check" width="17" height="17" />{feature}</li>)}
        </ul>
        <a href="#minh-hoa" className={`${styles.planButton} ${styles.primaryButton}`} onClick={() => dialogRef.current?.close()}>
          Khám phá bản mẫu trước <Icon name="arrow" width="18" height="18" />
        </a>
      </dialog>
    </>
  );
}
