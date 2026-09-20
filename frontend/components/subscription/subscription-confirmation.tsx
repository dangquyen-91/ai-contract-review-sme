"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { BillingCycle, demoOrganization, formatMoney, monthlyPrice, SubscriptionPlan } from "@/lib/subscription-plans";
import styles from "@/app/goi-dich-vu/subscription.module.css";

export function SubscriptionConfirmation({ plan, cycle }: { plan: SubscriptionPlan; cycle: BillingCycle }) {
  const [confirmed, setConfirmed] = useState(false);
  const total = monthlyPrice(plan, cycle) * (cycle === "yearly" ? 12 : 1);
  return <>
    <Link className={styles.back} href="/goi-dich-vu">← Quay lại gói dịch vụ</Link>
    <div className={styles.heading}><p className={styles.eyebrow}>LỰA CHỌN CỦA DOANH NGHIỆP</p><h1>Xem lại trước khi<br /><span>bạn quyết định.</span></h1><p>Mọi quyền lợi và chi phí trong một bản tóm tắt.</p></div>
    <div className={styles.checkout}>
      <section className={styles.checkoutDetails}><span className={styles.planIcon}><Icon name="building" /></span><h2>{demoOrganization}</h2><p>Doanh nghiệp mẫu · Organization Owner</p><hr /><h3>LawScan {plan.name}</h3><p>{plan.description}</p><ul>{[`${plan.reviews} lượt phân tích và ${plan.pages.toLocaleString("vi-VN")} trang mỗi tháng`, `${plan.members} thành viên, bao gồm Owner`, ...plan.features].map(feature => <li key={feature}><Icon name="check" width={18} height={18} />{feature}</li>)}</ul><div className={styles.notice}><Icon name="shield" /><p>Hạn mức dùng chung trong doanh nghiệp. Gói năm vẫn cấp hạn mức theo từng tháng; hết lượt hoặc số trang sẽ dừng phân tích mới.</p></div></section>
      <section className={styles.summary}><span className={styles.smallLabel}>TÓM TẮT LỰA CHỌN</span><h2>Gói {plan.name}</h2><dl><div><dt>Chu kỳ</dt><dd>{cycle === "yearly" ? "Hàng năm" : "Hàng tháng"}</dd></div><div><dt>Giá mỗi tháng</dt><dd>{formatMoney(monthlyPrice(plan, cycle))}</dd></div>{cycle === "yearly" && <div><dt>Tiết kiệm mỗi năm</dt><dd>{formatMoney((plan.monthly - plan.annualMonthly) * 12)}</dd></div>}<div className={styles.total}><dt>Tổng tiền minh họa</dt><dd>{formatMoney(total)}<small>/ {cycle === "yearly" ? "năm" : "tháng"}</small></dd></div></dl><p className={styles.billing}>Thuế và chính sách thanh toán chưa áp dụng trong bản demo.</p>
        <div className={styles.notice}><Icon name="lock" /><p>Đây là bản mô phỏng. Không thu tiền, không kích hoạt gói và không tự động gia hạn.</p></div>
        <button className={styles.primary} onClick={() => setConfirmed(true)} disabled={confirmed}>{confirmed ? "Đã xác nhận lựa chọn demo" : "Xác nhận lựa chọn demo"}<Icon name={confirmed ? "check" : "arrow"} width={18} height={18} /></button>
        <div role="status" aria-live="polite">{confirmed && <p className={styles.success}>Bạn đã chọn gói {plan.name} theo {cycle === "yearly" ? "năm" : "tháng"} trong bản demo. Lựa chọn chỉ tồn tại trên màn hình này, chưa lưu vào tài khoản.</p>}</div>
        <Link className={styles.changePlan} href="/goi-dich-vu">Chọn gói khác</Link>
      </section>
    </div>
  </>;
}
