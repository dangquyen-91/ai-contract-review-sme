"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import styles from "./staff-organization-required.module.css";

export function StaffOrganizationRequired({ email }: { email: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<"refresh" | "logout" | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    setPending("refresh");
    setError("");
    try {
      await authApi.refreshToken();
      queryClient.clear();
      router.refresh();
    } catch {
      setError("Không thể cập nhật tài khoản. Vui lòng thử lại hoặc đăng nhập lại.");
    } finally {
      setPending(null);
    }
  }

  async function switchAccount() {
    setPending("logout");
    setError("");
    try {
      await authApi.logout();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
      setPending(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}><Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link></header>
      <section className={styles.card} aria-labelledby="staff-join-heading">
        <span className={styles.icon}><Icon name="team" /></span>
        <p className={styles.eyebrow}>Không gian nhân viên</p>
        <h1 id="staff-join-heading">Tham gia tổ chức để bắt đầu</h1>
        <p className={styles.description}>Tài khoản của bạn chưa thuộc tổ chức nào. Hãy nhận lời mời từ Owner để cùng đội ngũ tải lên và rà soát hợp đồng.</p>
        <div className={styles.account}><Icon name="mail" /><div><span>Email đang đăng nhập</span><strong>{email}</strong></div></div>
        <ol className={styles.steps}>
          <li><strong>Nhận lời mời từ Owner</strong><p>Nhờ Owner mời đúng email ở trên và chọn vai trò Staff.</p></li>
          <li><strong>Mở email lời mời</strong><p>Bấm vào liên kết trong email để kiểm tra thông tin tổ chức.</p></li>
          <li><strong>Chấp nhận và vào làm việc</strong><p>Đăng nhập bằng email được mời, sau đó chấp nhận lời mời để vào dashboard Staff.</p></li>
        </ol>
        <p className={styles.note}>Nếu chưa thấy email, hãy kiểm tra thư rác hoặc nhờ Owner gửi lại lời mời.</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <button className={styles.primary} onClick={refresh} disabled={pending !== null}>{pending === "refresh" ? "Đang kiểm tra…" : "Đã tham gia? Kiểm tra lại"}<Icon name="arrow" /></button>
          <button className={styles.secondary} onClick={switchAccount} disabled={pending !== null}>{pending === "logout" ? "Đang đăng xuất…" : "Đổi tài khoản"}</button>
        </div>
      </section>
    </main>
  );
}
