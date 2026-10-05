"use client";

import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import styles from "@/styles/owner-error.module.css";

export default function OwnerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
  const isUnauthorized = status === 401;
  const needsOrganization = status === 403;
  const title = isUnauthorized
    ? "Phiên đăng nhập đã hết hạn"
    : needsOrganization
      ? "Cần thiết lập tổ chức"
      : "Dashboard đang tạm gián đoạn";
  const description = isUnauthorized
    ? "Vui lòng đăng nhập lại để tiếp tục quản lý hợp đồng của tổ chức."
    : needsOrganization
      ? "Tài khoản của bạn chưa có tổ chức để mở dashboard owner."
      : "Dữ liệu chưa thể tải lúc này. Bạn có thể thử lại sau ít phút.";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
        <span>Không gian tổ chức</span>
      </header>

      <div className={styles.content}>
        <div className={styles.card} role="alert">
          <span className={styles.symbol}><Icon name={isUnauthorized ? "lock" : needsOrganization ? "building" : "shield"} /></span>
          <p className={styles.eyebrow}>LawScan · Dashboard owner</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>

          <div className={styles.actions}>
            {isUnauthorized ? (
              <Link className={styles.primary} href="/dang-nhap">Đăng nhập lại <Icon name="arrow" /></Link>
            ) : needsOrganization ? (
              <Link className={styles.primary} href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link>
            ) : (
              <button className={styles.primary} type="button" onClick={retry}>Thử tải lại <Icon name="arrow" /></button>
            )}
            <Link className={styles.secondary} href="/">Về trang chủ</Link>
          </div>
        </div>
        <p className={styles.help}>Nếu sự cố tiếp diễn, hãy thử đăng nhập lại hoặc liên hệ đội ngũ hỗ trợ LawScan.</p>
      </div>
    </main>
  );
}
