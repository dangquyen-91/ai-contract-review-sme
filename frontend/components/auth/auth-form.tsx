"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { get, useForm, useWatch, type FieldError as FormFieldError, type FieldErrors, type FieldPath, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { useAuthMutation } from "@/hooks/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { authFormSchema } from "@/schemas/auth.schema";
import type { AuthFormValues, AuthMode, AuthMutationVariables } from "@/types/auth";
import styles from "@/styles/auth.module.css";

const authFields = new Set<FieldPath<AuthFormValues>>([
  "name",
  "email",
  "password",
  "confirmPassword",
  "remember",
]);

function isAuthField(field: string): field is FieldPath<AuthFormValues> {
  return authFields.has(field as FieldPath<AuthFormValues>);
}

function getFieldError(errors: FieldErrors<AuthFormValues>, field: FieldPath<AuthFormValues>) {
  return get(errors, field) as FormFieldError | undefined;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} className={styles.fieldError} role="alert">{message}</span>;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const router = useRouter();
  const authMutation = useAuthMutation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    mode: "onBlur",
    defaultValues: {
      mode,
      email: "",
      password: "",
      remember: false,
      name: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";
  const nameError = getFieldError(errors, "name");
  const confirmPasswordError = getFieldError(errors, "confirmPassword");

  const submit: SubmitHandler<AuthFormValues> = async (values) => {
    let request: AuthMutationVariables;

    if (values.mode === "register") {
      const { confirmPassword: _confirmPassword, mode: _mode, ...data } = values;
      void _confirmPassword;
      void _mode;
      request = { mode: "register", data };
    } else {
      const { mode: _mode, ...data } = values;
      void _mode;
      request = { mode: "login", data };
    }

    try {
      const session = await authMutation.mutateAsync(request);
      toast.success(isRegister ? "Đăng ký thành công" : "Đăng nhập thành công", {
        description: isRegister
          ? "Tài khoản của bạn đã được tạo."
          : "Chào mừng bạn quay lại LawScan.",
      });
      router.push(
        !session.user.hasCompletedOnboarding
          ? "/chon-to-chuc"
          : ["owner", "administrator", "manager"].includes(session.user.role)
            ? "/dashboard/owner"
            : "/dashboard/user",
      );
      router.refresh();
    } catch (error) {
      if (!isApiClientError(error)) {
        const message = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
        setError("root.server", { message });
        toast.error(message);
        return;
      }

      for (const [field, messages] of Object.entries(error.details ?? {})) {
        if (isAuthField(field) && messages[0]) {
          setError(field, { type: "server", message: messages[0] });
        }
      }
      setError("root.server", { type: "server", message: error.message });
      toast.error(error.message);
    }
  };

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
        <h1>{isRegister ? "Tạo tài khoản LawScan" : "Đăng nhập vào LawScan"}</h1>
        <p>{isRegister ? "Đăng ký tài khoản để bắt đầu sử dụng LawScan." : "Tiếp tục công việc rà soát hợp đồng của bạn."}</p>
      </header>

      <form onSubmit={handleSubmit(submit)} className={styles.form} noValidate>
        <input type="hidden" {...register("mode")} />

        {isRegister && (
          <>
            <label className={styles.field} htmlFor="name">
              <span>Họ và tên</span>
              <span className={`${styles.inputShell} ${nameError ? styles.inputShellError : ""}`}><Icon name="user" /><input id="name" autoComplete="name" maxLength={100} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? "name-error" : undefined} placeholder="Nguyễn Minh Anh" {...register("name")} /></span>
              <FieldError id="name-error" message={nameError?.message} />
            </label>
          </>
        )}

        <label className={styles.field} htmlFor="email">
          <span>Email công việc</span>
          <span className={`${styles.inputShell} ${errors.email ? styles.inputShellError : ""}`}><Icon name="mail" /><input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} placeholder="ban@doanhnghiep.vn" {...register("email")} /></span>
          <FieldError id="email-error" message={errors.email?.message} />
        </label>

        <label className={styles.field} htmlFor="password">
          <span>Mật khẩu</span>
          <span className={`${styles.inputShell} ${errors.password ? styles.inputShellError : ""}`}>
            <Icon name="lock" />
            <input id="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} placeholder={isRegister ? "Tối thiểu 12 ký tự" : "Nhập mật khẩu"} {...register("password")} />
            <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Icon name={showPassword ? "eyeOff" : "eye"} /></button>
          </span>
          <FieldError id="password-error" message={errors.password?.message} />
        </label>

        {isRegister && (
          <>
            <label className={styles.field} htmlFor="confirmPassword">
              <span>Nhập lại mật khẩu</span>
              <span className={`${styles.inputShell} ${confirmPasswordError ? styles.inputShellError : ""}`}><Icon name="lock" /><input id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" aria-invalid={Boolean(confirmPasswordError)} aria-describedby={confirmPasswordError ? "confirmPassword-error" : undefined} placeholder="Nhập lại mật khẩu vừa tạo" {...register("confirmPassword")} /></span>
              <FieldError id="confirmPassword-error" message={confirmPasswordError?.message} />
            </label>
            <div className={styles.passwordHint} aria-live="polite">
              <span className={passwordLongEnough ? styles.hintPassed : ""}><i />Ít nhất 12 ký tự</span>
              <span className={passwordWithinLimit && passwordNotCommon && password ? styles.hintPassed : ""}><i />Không phải mật khẩu phổ biến</span>
              <span className={passwordsMatch ? styles.hintPassed : ""}><i />Hai mật khẩu trùng khớp</span>
            </div>
          </>
        )}

        {!isRegister && <label className={styles.remember}><input type="checkbox" {...register("remember")} /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>}

        {errors.root?.server?.message && <p className={styles.error} role="alert"><span>!</span>{errors.root.server.message}</p>}

        <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}</span>
          {isSubmitting ? <i className={styles.spinner} aria-hidden="true" /> : <Icon name="arrow" />}
        </button>
      </form>

      <p className={styles.switchText}>{isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={isRegister ? "/dang-nhap" : "/dang-ky"}>{isRegister ? "Đăng nhập" : "Tạo tài khoản"}</Link></p>
      <p className={styles.notice}>{isRegister ? "LawScan chỉ dùng thông tin trên để tạo và bảo vệ tài khoản của bạn." : "AI hỗ trợ rà soát sơ bộ và không thay thế tư vấn pháp lý chuyên nghiệp."}</p>
    </div>
  );
}
