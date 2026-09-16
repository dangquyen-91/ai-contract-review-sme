import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import styles from "@/app/(auth)/auth.module.css";

export function AuthShell({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <main className={styles.shell}>
      <aside className={styles.showcase}>{panel}</aside>
      <section className={styles.formSide}>
        <div className={styles.mobileTopbar}>
          <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
          <Link href="/">Về trang chủ</Link>
        </div>
        <Link className={styles.backLink} href="/"><Icon name="arrow" />Về trang chủ</Link>
        {children}
        <p className={styles.securityNote}><Icon name="shield" />Kết nối được bảo vệ. LawScan không hiển thị mật khẩu của bạn.</p>
      </section>
    </main>
  );
}
