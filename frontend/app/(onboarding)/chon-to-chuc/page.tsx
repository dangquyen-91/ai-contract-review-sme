import type { Metadata } from "next";
import Link from "next/link";
import { CompanyChoice } from "@/components/onboarding/company-choice";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import styles from "@/styles/onboarding.module.css";

export const metadata: Metadata = {
  title: "Thiết lập tổ chức | LawScan",
  description: "Chọn cách thiết lập không gian làm việc LawScan của bạn.",
};

export default function ChooseOrganizationPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.contextPanel}>
        <Link className={styles.contextBrand} href="/" aria-label="LawScan — về trang chủ">
          <Brand />
        </Link>

        <div className={styles.contextCopy}>
          <p>Thiết lập một lần</p>
          <h2>Hợp đồng rõ ràng hơn khi đúng người cùng xem.</h2>
          <div className={styles.benefits}>
            <div><Icon name="team" /><span><strong>Làm việc cùng đội ngũ</strong><small>Mời thành viên và thống nhất quy trình rà soát.</small></span></div>
            <div><Icon name="shield" /><span><strong>Phân tách dữ liệu</strong><small>Hợp đồng được quản lý theo từng tổ chức.</small></span></div>
          </div>
        </div>

        <p className={styles.contextFoot}>Bạn có thể hoàn tất thiết lập trong chưa đầy một phút.</p>
      </aside>

      <section className={styles.decisionPanel}>
        <Link className={styles.mobileBrand} href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
        <CompanyChoice />
      </section>
    </main>
  );
}
