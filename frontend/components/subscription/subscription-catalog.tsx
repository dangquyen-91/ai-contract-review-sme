"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { BillingCycle, formatMoney, monthlyPrice, subscriptionPlans } from "@/lib/subscription-plans";
import styles from "@/app/goi-dich-vu/subscription.module.css";

const comparison = [
  ["Lượt phân tích / tháng", "20", "80"],
  ["Trang xử lý / tháng", "300", "1.500"],
  ["Thành viên, bao gồm Owner", "3", "10"],
  ["Giải thích và nguồn tham chiếu", "Có", "Có"],
  ["Xuất báo cáo rà soát", "Có", "Có"],
  ["Phân công Reviewer / Staff", "Không", "Có"],
  ["Lịch sử rà soát chung", "Không", "Có"],
];
const faqs = [
  ["Mỗi thành viên có cần mua gói riêng không?", "Không. Một gói áp dụng cho cả doanh nghiệp. Lượt phân tích và số trang được dùng chung; số thành viên đã bao gồm Organization Owner."],
  ["Hạn mức được tính như thế nào?", "Mỗi lần gửi một hợp đồng để phân tích là một lượt. Số trang được tính riêng; khi hết lượt hoặc hết số trang, cần nâng cấp hoặc chờ kỳ mới. Phân tích lại được tính là lượt mới. Đây là quy tắc minh họa của bản demo."],
  ["Gói năm có được nhận toàn bộ hạn mức ngay không?", "Không. Gói năm thanh toán một lần cho 12 tháng, nhưng hạn mức phân tích và số trang vẫn được cấp theo từng tháng. Hạn mức chưa dùng không cộng dồn trong phương án minh họa này."],
  ["Hết dùng thử thì dữ liệu có mất không?", "Thiết kế dự kiến cho phép xem kết quả cũ và chọn gói để tiếp tục phân tích. Chính sách lưu trữ chính thức sẽ được công bố trước khi mở bán."],
  ["Chọn gói ở đây có bị thu tiền không?", "Không. Đây là trải nghiệm minh họa. Bạn có thể xem giá và xác nhận lựa chọn demo; không có giao dịch, tự động gia hạn hay thay đổi tài khoản thật."],
];

export function SubscriptionCatalog() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  return <>
    <div className={styles.heading}><p className={styles.eyebrow}>ĐẦU TƯ CHO QUYẾT ĐỊNH RÕ RÀNG HƠN</p><h1>Một gói dịch vụ.<br /><span>Cả đội ngũ cùng sử dụng.</span></h1><p>Chọn không gian phù hợp để quản lý hợp đồng và phối hợp rà soát.<br />Hạn mức dùng chung, quyền lợi rõ ràng ngay từ đầu.</p></div>
    <section className={styles.trial} aria-labelledby="trial-heading">
      <div><span className={styles.smallLabel}>GÓI HIỆN TẠI · DỮ LIỆU MẪU</span><h2 id="trial-heading">Dùng thử <span className={styles.pill}>Còn 4 ngày</span></h2><p>Trải nghiệm quy trình trước khi chọn gói.</p></div>
      <div className={styles.meters}>{[["Lượt phân tích", 2, 3], ["Trang xử lý", 24, 100], ["Thành viên", 1, 2]].map(([label, value, max]) => <div key={label}><div><span>{label}</span><strong>{value}/{max}</strong></div><progress aria-label={`${label} đã dùng`} value={value} max={max} /></div>)}</div>
    </section>
    <div className={styles.controls}><div><h2>Chọn cách đồng hành</h2><p>Giá và quyền lợi dự kiến, chưa mở bán.</p></div><fieldset className={styles.switch}><legend className={styles.srOnly}>Chu kỳ thanh toán</legend>{(["monthly", "yearly"] as const).map(value => <label key={value} className={cycle === value ? styles.selectedCycle : ""}><input type="radio" name="cycle" checked={cycle === value} onChange={() => setCycle(value)} /><span>{value === "monthly" ? "Hàng tháng" : "Hàng năm"}</span>{value === "yearly" && <small>Tiết kiệm hơn</small>}</label>)}</fieldset></div>
    <div className={styles.plans}>{subscriptionPlans.map(plan => <article className={`${styles.plan} ${plan.id === "team" ? styles.featured : ""}`} key={plan.id}>
      <div className={styles.planTop}><span className={styles.planIcon}><Icon name={plan.id === "team" ? "team" : "document"} /></span>{plan.id === "team" && <span className={styles.pill}>Dành cho đội ngũ</span>}</div>
      <h2>{plan.name}</h2><p>{plan.description}</p>
      <div className={styles.price} aria-live="polite"><strong>{formatMoney(monthlyPrice(plan, cycle))}</strong><span>/ tháng</span></div>
      <p className={styles.billing}>{cycle === "yearly" ? `${formatMoney(monthlyPrice(plan, cycle) * 12)} / năm, thanh toán một lần.` : "Cho cả doanh nghiệp, thanh toán hàng tháng."}</p>
      <Link className={plan.id === "team" ? styles.primary : styles.secondary} href={`/goi-dich-vu/xac-nhan?plan=${plan.id}&cycle=${cycle}`}>Chọn gói {plan.name}<Icon name="arrow" width={18} height={18} /></Link>
      <div className={styles.quotas}><div><strong>{plan.reviews}</strong><span>lượt / tháng</span></div><div><strong>{plan.pages.toLocaleString("vi-VN")}</strong><span>trang / tháng</span></div><div><strong>{plan.members}</strong><span>thành viên</span></div></div>
      <ul>{plan.features.map(feature => <li key={feature}><Icon name="check" width={18} height={18} />{feature}</li>)}</ul>
      <p className={styles.planFoot}>Số thành viên bao gồm Owner. Dừng phân tích khi hết lượt hoặc số trang.</p>
    </article>)}</div>
    <p className={styles.priceNote}>Giá minh họa bằng VNĐ. Thuế và chính sách thanh toán sẽ được công bố khi mở bán.</p>
    <section className={styles.comparison} aria-labelledby="comparison-heading"><h2 id="comparison-heading">Đúng nhu cầu, rõ quyền lợi.</h2><p>Đối chiếu những gì đội ngũ của bạn cần mỗi ngày.</p><div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Bảng so sánh gói có thể cuộn ngang"><table><caption className={styles.srOnly}>So sánh gói Cơ bản và Nhóm</caption><thead><tr><th scope="col">Quyền lợi</th><th scope="col">Cơ bản</th><th scope="col">Nhóm</th></tr></thead><tbody>{comparison.map(([label, basic, team]) => <tr key={label}><th scope="row">{label}</th><td>{basic}</td><td>{team}</td></tr>)}</tbody></table></div></section>
    <section className={styles.faq} aria-labelledby="faq-heading"><div><p className={styles.eyebrow}>TRƯỚC KHI BẠN CHỌN</p><h2 id="faq-heading">Một vài điều<br />cần làm rõ.</h2><p>Để bạn biết mình sẽ nhận được gì.</p></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
  </>;
}
