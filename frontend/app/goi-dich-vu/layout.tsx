import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { demoOrganization } from "@/lib/subscription-plans";
import styles from "./subscription.module.css";

export const metadata = { title: "Gói dịch vụ | LawScan", robots: { index: false, follow: false } };

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <a href="#subscription-content" className={styles.skip}>Đến nội dung chính</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand} aria-label="LawScan — về trang chủ"><Brand /></Link>
      <div className={styles.organization}><Icon name="building" /><div><strong>{demoOrganization}</strong><span>Doanh nghiệp mẫu</span></div></div>
      <p className={styles.navLabel}>KHÔNG GIAN DOANH NGHIỆP</p>
      <nav aria-label="Điều hướng doanh nghiệp">
        <Link href="/goi-dich-vu" className={styles.navActive}><Icon name="briefcase" />Gói dịch vụ</Link>
        <Link href="/bao-cao-mau"><Icon name="document" />Khám phá báo cáo mẫu</Link>
        <Link href="/"><Icon name="arrow" />Về trang chủ</Link>
      </nav>
      <div className={styles.sidebarBottom}><Icon name="user" /><div><strong>Organization Owner</strong><span>Vai trò minh họa</span></div></div>
    </aside>
    <div className={styles.body}>
      <header className={styles.topbar}><span>Doanh nghiệp <span aria-hidden="true">/</span> <strong>Gói dịch vụ</strong></span><span className={styles.demoBadge}>Bản demo</span></header>
      <main id="subscription-content" className={styles.main}>{children}</main>
      <footer className={styles.footer}>LawScan · Rõ từng điều khoản, vững mỗi quyết định.<span>Dữ liệu và giá trên trang đều là minh họa.</span></footer>
    </div>
  </div>;
}
