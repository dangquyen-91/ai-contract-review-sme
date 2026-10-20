"use client";

/* Error recovery uses full document navigation so links also work after a root layout failure. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import styles from "./status-page.module.css";

type StatusPageProps = {
  kind: "error" | "not-found" | "unauthorized" | "organization";
  onRetry?: () => void;
};

const content = {
  "not-found": {
    code: "404", label: "Không tìm thấy trang", title: "Có vẻ bạn đã đi lạc.",
    description: "Trang bạn tìm có thể đã được di chuyển, không còn tồn tại hoặc đường dẫn chưa chính xác.",
    note: "Kiểm tra lại đường dẫn hoặc trở về trang chủ để tiếp tục.",
    document: "Không tìm thấy tài liệu",
  },
  error: {
    code: "500", label: "Đã có lỗi xảy ra", title: "Một chút gián đoạn.\nChúng mình sẽ thử lại.",
    description: "LawScan chưa thể tải nội dung lúc này. Vui lòng thử lại sau ít phút hoặc trở về trang chủ.",
    note: "Nếu lỗi tiếp diễn, hãy thử tải lại trang hoặc đăng nhập lại.",
    document: "Chưa thể tải nội dung",
  },
  unauthorized: {
    code: "401", label: "Cần đăng nhập", title: "Đăng nhập để\ntiếp tục công việc.",
    description: "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại để mở không gian làm việc.",
    note: "Sử dụng tài khoản LawScan của bạn để tiếp tục.",
    document: "Phiên đăng nhập đã hết hạn",
  },
  organization: {
    code: "403", label: "Cần thiết lập tổ chức", title: "Thêm một bước\nđể bắt đầu.",
    description: "Tài khoản của bạn chưa có quyền mở không gian tổ chức này. Chọn tổ chức hoặc hoàn tất thiết lập để tiếp tục.",
    note: "Nếu đã thuộc tổ chức, hãy liên hệ người quản lý để kiểm tra quyền truy cập.",
    document: "Kiểm tra quyền truy cập",
  },
} as const;

/** Shared fallback UI; independent of session and query providers. */
export function StatusPage({ kind, onRetry }: StatusPageProps) {
  const page = content[kind];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" aria-label="LawScan — về trang chủ"><Brand /></a>
        <span>Trợ lý rà soát hợp đồng</span>
      </header>
      <main className={styles.main} id="status-content">
        <section className={styles.copy} aria-labelledby="status-title">
          <p className={styles.eyebrow}><span />{page.label}</p>
          <h1 id="status-title">{page.title}</h1>
          <p className={styles.description}>{page.description}</p>
          <div className={styles.actions}>
            {kind === "error" && onRetry ? (
              <Button onClick={onRetry}><Icon name="arrow" />Thử lại</Button>
            ) : kind === "unauthorized" ? (
              <Button asChild><a href="/dang-nhap">Đăng nhập lại<Icon name="arrow" /></a></Button>
            ) : kind === "organization" ? (
              <Button asChild><a href="/chon-to-chuc">Chọn tổ chức<Icon name="arrow" /></a></Button>
            ) : (
              <Button asChild><a href="/">Về trang chủ<Icon name="arrow" /></a></Button>
            )}
            {kind === "not-found" ? (
              <a className={styles.secondary} href="/dashboard">Mở không gian làm việc<Icon name="diagonal" /></a>
            ) : (
              <a className={styles.secondary} href="/">Về trang chủ<Icon name="diagonal" /></a>
            )}
          </div>
          <p className={styles.note}>{page.note}</p>
        </section>
        <div className={styles.art} aria-hidden="true">
          <span className={styles.code}>{page.code}</span>
          <div className={styles.document}>
            <div className={styles.documentTop}><Icon name="document" /><span>LAWSCAN / {page.code}</span></div>
            <div className={styles.lines}><i /><i /><i /></div>
            <div className={styles.documentState}><Icon name={kind === "not-found" ? "search" : kind === "error" ? "document" : "lock"} /><span>{page.document}</span></div>
            <div className={styles.lines}><i /><i /></div>
          </div>
          <span className={styles.artCaption}>Nhìn rõ rủi ro. Trước khi bạn ký.</span>
        </div>
      </main>
      <footer className={styles.footer}><span>LawScan</span><span>Hiểu hợp đồng. Vững quyết định.</span></footer>
    </div>
  );
}
