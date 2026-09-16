"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import styles from "@/app/(auth)/auth.module.css";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    form.delete("remember");
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error?.message ?? "Không thể xử lý yêu cầu. Vui lòng thử lại.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setMessage("Không thể kết nối máy chủ LawScan. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.formCard}>
      <nav className={styles.authTabs} aria-label="Chọn hình thức truy cập">
        <Link href="/dang-nhap" aria-current={!isRegister ? "page" : undefined}>Đăng nhập</Link>
        <Link href="/dang-ky" aria-current={isRegister ? "page" : undefined}>Đăng ký</Link>
      </nav>

      <header className={styles.formHeader}>
        <p className={styles.kicker}>{isRegister ? "Bắt đầu với LawScan" : "Chào mừng trở lại"}</p>
        <h1>{isRegister ? "Tạo không gian làm việc" : "Đăng nhập vào LawScan"}</h1>
        <p>{isRegister ? "Thiết lập tài khoản đầu tiên cho doanh nghiệp của bạn." : "Tiếp tục công việc rà soát hợp đồng của bạn."}</p>
      </header>

      <form onSubmit={submit} className={styles.form}>
        {isRegister && (
          <>
            <label className={styles.field}>
              <span>Tên doanh nghiệp</span>
              <span className={styles.inputShell}><Icon name="building" /><input name="orgName" autoComplete="organization" minLength={2} maxLength={200} required placeholder="Ví dụ: Công ty An Phát" /></span>
            </label>
            <label className={styles.field}>
              <span>Họ và tên</span>
              <span className={styles.inputShell}><Icon name="user" /><input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Nguyễn Minh Anh" /></span>
            </label>
          </>
        )}

        <label className={styles.field}>
          <span>Email công việc</span>
          <span className={styles.inputShell}><Icon name="mail" /><input type="email" name="email" autoComplete="email" required placeholder="ban@doanhnghiep.vn" /></span>
        </label>

        <label className={styles.field}>
          <span>Mật khẩu</span>
          <span className={styles.inputShell}>
            <Icon name="lock" />
            <input type={showPassword ? "text" : "password"} name="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : 1} required placeholder={isRegister ? "Tối thiểu 8 ký tự" : "Nhập mật khẩu"} />
            <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
          </span>
        </label>

        {isRegister ? (
          <div className={styles.passwordHint} aria-live="polite">
            <span className={password.length >= 8 ? styles.hintPassed : ""}><i />Ít nhất 8 ký tự</span>
            <span className={/[A-Za-zÀ-ỹ]/.test(password) && /\d/.test(password) ? styles.hintPassed : ""}><i />Nên kết hợp chữ và số</span>
          </div>
        ) : (
          <label className={styles.remember}><input type="checkbox" name="remember" /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>
        )}

        {message && <p className={styles.error} role="alert"><span>!</span>{message}</p>}

        <button className={styles.submitButton} type="submit" disabled={submitting}>
          <span>{submitting ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}</span>
          {submitting ? <i className={styles.spinner} aria-hidden="true" /> : <Icon name="arrow" />}
        </button>
      </form>

      <p className={styles.switchText}>{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={isRegister ? "/dang-nhap" : "/dang-ky"}>{isRegister ? "Đăng nhập" : "Tạo tài khoản"}</Link></p>
      <p className={styles.notice}>{isRegister ? "Bằng việc tạo tài khoản, bạn đồng ý sử dụng LawScan cho mục đích hỗ trợ rà soát sơ bộ." : "AI hỗ trợ rà soát sơ bộ và không thay thế tư vấn pháp lý chuyên nghiệp."}</p>
    </div>
  );
}
