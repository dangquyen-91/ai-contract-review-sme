"use client";
import { useEmailVerification } from "@/hooks/auth/use-email-verification";
import type { EmailVerificationOptions } from "@/types/auth";

export function EmailVerificationForm(options: EmailVerificationOptions) {
  const {
    email,
    code,
    setCode,
    error,
    notice,
    busy,
    remaining,
    verify,
    resend,
  } = useEmailVerification(options);
  const { onBack } = options;
  return (
    <section className="w-full max-w-[460px] rounded-2xl border border-[#dce5f2] bg-white p-6 text-[#14213d]">
      <h1 className="text-2xl font-bold">Xác minh email</h1>
      <p className="mt-3 text-sm leading-6">
        Nhập mã 6 chữ số đã gửi tới{" "}
        <strong className="break-all">{email}</strong>. Mã có hiệu lực trong 10
        phút. Kiểm tra cả thư mục Spam.
      </p>
      <form onSubmit={verify} className="mt-6 grid gap-4">
        <label htmlFor="verification-code" className="text-sm font-semibold">
          Mã OTP
        </label>
        <input
          id="verification-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          disabled={busy}
          aria-describedby={error ? "verification-error" : undefined}
          className="min-h-12 rounded-lg border border-[#d5deea] px-4 text-center text-xl tracking-[0.4em] focus:outline-2 focus:outline-[#2864dc]"
        />
        {error && (
          <p
            id="verification-error"
            role="alert"
            className="text-sm text-[#9c2032]"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-[#16715d]">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="min-h-12 rounded-lg bg-[#2864dc] px-4 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Đang xử lý..." : "Xác minh và tiếp tục"}
        </button>
        <button
          type="button"
          disabled={busy || remaining > 0}
          onClick={resend}
          className="text-sm text-[#2864dc] underline disabled:opacity-50"
        >
          {remaining > 0 ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="text-sm text-[#69788e] underline"
        >
          Quay lại đăng ký / đăng nhập
        </button>
      </form>
    </section>
  );
}
