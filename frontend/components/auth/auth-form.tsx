"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { loginFormSchema, registerFormSchema } from "@/lib/auth-validation";
import styles from "@/app/(auth)/auth.module.css";

type FieldErrors = Record<string, string>;

function firstIssueByField(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} className={styles.fieldError} role="alert">{message}</span>;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});

    const form = new FormData(event.currentTarget);
    const raw = Object.fromEntries(form.entries());
    let body: Record<string, unknown>;

    if (isRegister) {
      const result = registerFormSchema.safeParse(raw);
      if (!result.success) {
        setErrors(firstIssueByField(result.error.issues));
        return;
      }
      const { confirmPassword: _confirmPassword, ...registration } = result.data;
      void _confirmPassword;
      body = registration;
    } else {
      const result = loginFormSchema.safeParse({ ...raw, remember: form.get("remember") === "on" });
      if (!result.success) {
        setErrors(firstIssueByField(result.error.issues));
        return;
      }
      body = result.data;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        const details = payload.error?.details;
        if (details && typeof details === "object") {
          const serverErrors = Object.entries(details).reduce<FieldErrors>((result, [field, value]) => {
            if (Array.isArray(value) && typeof value[0] === "string") result[field] = value[0];
            return result;
          }, {});
          if (Object.keys(serverErrors).length) setErrors(serverErrors);
        }
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

  const passwordLongEnough = password.length >= 12;
  const passwordWithinLimit = new TextEncoder().encode(password).length <= 72;
  const passwordNotCommon = !["123456789012", "password1234", "admin12345678", "qwerty123456", "lawscan123456"].includes(password.toLowerCase());
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <div className={`${styles.formCard} ${isRegister ? styles.registerCard : ""}`}>
      <nav className={styles.authTabs} aria-label="Chọn hình thức truy cập">
        <Link href="/dang-nhap" aria-current={!isRegister ? "page" : undefined}>Đăng nhập</Link>
        <Link href="/dang-ky" aria-current={isRegister ? "page" : undefined}>Đăng ký</Link>
      </nav>

      <header className={styles.formHeader}>
        <p className={styles.kicker}>{isRegister ? "Bắt đầu với LawScan" : "Chào mừng trở lại"}</p>
        <h1>{isRegister ? "Tạo không gian làm việc" : "Đăng nhập vào LawScan"}</h1>
        <p>{isRegister ? "Thiết lập tài khoản đầu tiên cho doanh nghiệp của bạn." : "Tiếp tục công việc rà soát hợp đồng của bạn."}</p>
      </header>

      {isRegister && <div className={styles.accountRoleNote}><Icon name="shield" /><p><strong>Bạn sẽ là quản trị viên đầu tiên</strong><span>Tài khoản này được gắn với không gian làm việc của doanh nghiệp.</span></p></div>}

      <form onSubmit={submit} className={styles.form} noValidate>
        {isRegister && (
          <>
            <label className={styles.field} htmlFor="orgName">
              <span>Tên doanh nghiệp</span>
              <span className={`${styles.inputShell} ${errors.orgName ? styles.inputShellError : ""}`}><Icon name="building" /><input id="orgName" name="orgName" autoComplete="organization" maxLength={200} required aria-invalid={Boolean(errors.orgName)} aria-describedby={errors.orgName ? "orgName-error" : undefined} onInput={() => clearError("orgName")} placeholder="Ví dụ: Công ty An Phát" /></span>
              <FieldError id="orgName-error" message={errors.orgName} />
            </label>
            <label className={styles.field} htmlFor="name">
              <span>Họ và tên</span>
              <span className={`${styles.inputShell} ${errors.name ? styles.inputShellError : ""}`}><Icon name="user" /><input id="name" name="name" autoComplete="name" maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} onInput={() => clearError("name")} placeholder="Nguyễn Minh Anh" /></span>
              <FieldError id="name-error" message={errors.name} />
            </label>
          </>
        )}

        <label className={styles.field} htmlFor="email">
          <span>Email công việc</span>
          <span className={`${styles.inputShell} ${errors.email ? styles.inputShellError : ""}`}><Icon name="mail" /><input id="email" type="email" name="email" autoComplete="email" inputMode="email" maxLength={254} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} onInput={() => clearError("email")} placeholder="ban@doanhnghiep.vn" /></span>
          <FieldError id="email-error" message={errors.email} />
        </label>

        <label className={styles.field} htmlFor="password">
          <span>Mật khẩu</span>
          <span className={`${styles.inputShell} ${errors.password ? styles.inputShellError : ""}`}>
            <Icon name="lock" />
            <input id="password" type={showPassword ? "text" : "password"} name="password" value={password} onChange={(event) => { setPassword(event.target.value); clearError("password"); }} autoComplete={isRegister ? "new-password" : "current-password"} required aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} placeholder={isRegister ? "Tối thiểu 12 ký tự" : "Nhập mật khẩu"} />
            <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
          </span>
          <FieldError id="password-error" message={errors.password} />
        </label>

        {isRegister && (
          <>
            <label className={styles.field} htmlFor="confirmPassword">
              <span>Nhập lại mật khẩu</span>
              <span className={`${styles.inputShell} ${errors.confirmPassword ? styles.inputShellError : ""}`}><Icon name="lock" /><input id="confirmPassword" type={showPassword ? "text" : "password"} name="confirmPassword" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError("confirmPassword"); }} autoComplete="new-password" required aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} placeholder="Nhập lại mật khẩu vừa tạo" /></span>
              <FieldError id="confirmPassword-error" message={errors.confirmPassword} />
            </label>
            <div className={styles.passwordHint} aria-live="polite">
              <span className={passwordLongEnough ? styles.hintPassed : ""}><i />Ít nhất 12 ký tự</span>
              <span className={passwordWithinLimit && passwordNotCommon && password ? styles.hintPassed : ""}><i />Không phải mật khẩu phổ biến</span>
              <span className={passwordsMatch ? styles.hintPassed : ""}><i />Hai mật khẩu trùng khớp</span>
            </div>
          </>
        )}

        {!isRegister && <label className={styles.remember}><input type="checkbox" name="remember" /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>}

        {message && <p className={styles.error} role="alert"><span>!</span>{message}</p>}

        <button className={styles.submitButton} type="submit" disabled={submitting}>
          <span>{submitting ? "Đang xử lý…" : isRegister ? "Tạo tài khoản quản trị" : "Đăng nhập"}</span>
          {submitting ? <i className={styles.spinner} aria-hidden="true" /> : <Icon name="arrow" />}
        </button>
      </form>

      <p className={styles.switchText}>{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={isRegister ? "/dang-nhap" : "/dang-ky"}>{isRegister ? "Đăng nhập" : "Tạo tài khoản"}</Link></p>
      <p className={styles.notice}>{isRegister ? "LawScan chỉ dùng thông tin trên để tạo không gian làm việc và tài khoản quản trị của doanh nghiệp." : "AI hỗ trợ rà soát sơ bộ và không thay thế tư vấn pháp lý chuyên nghiệp."}</p>
    </div>
  );
}
