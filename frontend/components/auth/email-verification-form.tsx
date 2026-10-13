"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { workspacePath } from "@/lib/workspace-path";
import type { EmailVerificationChallenge } from "@/types/auth";

function errorMessage(error: unknown) {
  if (!isApiClientError(error)) return "Không thể xác minh lúc này. Vui lòng thử lại.";
  if (error.status === 429) return "Bạn đã thử quá nhiều lần. Vui lòng đợi trước khi gửi lại mã.";
  if (error.message === "Incorrect verification code") return "Mã OTP chưa đúng. Vui lòng kiểm tra email.";
  if (error.message.includes("expired") || error.message.includes("unavailable")) return "Mã OTP đã hết hạn hoặc không còn hiệu lực. Hãy gửi lại mã.";
  if (error.message.includes("Invitation")) return "Lời mời không còn hợp lệ. Hãy mở lại link hoặc liên hệ Owner.";
  if (error.message === "Email already registered") return "Email đã có tài khoản. Hãy quay lại đăng nhập.";
  if (!error.status || error.status >= 500) return "Không thể kết nối hoặc gửi email lúc này. Vui lòng thử lại.";
  return "Không thể xác minh. Hãy kiểm tra mã hoặc quay lại đăng nhập để bắt đầu lại.";
}

export function EmailVerificationForm({ initialChallenge, invitationToken, onBack }: {
  initialChallenge: EmailVerificationChallenge;
  invitationToken?: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [challenge, setChallenge] = useState(initialChallenge);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(initialChallenge.resendAfterSeconds);
  useEffect(() => {
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) { setError("Vui lòng nhập đủ 6 chữ số trong email."); return; }
    setBusy(true);
    setError("");
    try {
      const session = await authApi.verifyEmail({ challengeId: challenge.challengeId, code, invitationToken });
      router.replace(invitationToken ? `/loi-moi?token=${invitationToken}` : workspacePath(session.user));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || remaining > 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await authApi.resendVerification({ challengeId: challenge.challengeId, invitationToken });
      setChallenge(next);
      setCode("");
      setRemaining(next.resendAfterSeconds);
      setNotice("Đã gửi mã mới. Vui lòng dùng mã trong email mới nhất.");
    } catch (err) {
      setError(errorMessage(err));
    } finally { setBusy(false); }
  }

  return <section className="w-full max-w-[460px] rounded-2xl border border-[#dce5f2] bg-white p-6 text-[#14213d]">
    <h1 className="text-2xl font-bold">Xác minh email</h1>
    <p className="mt-3 text-sm leading-6">Nhập mã 6 chữ số đã gửi tới <strong className="break-all">{challenge.email}</strong>. Mã có hiệu lực trong 10 phút. Kiểm tra cả thư mục Spam.</p>
    <form onSubmit={verify} className="mt-6 grid gap-4">
      <label htmlFor="verification-code" className="text-sm font-semibold">Mã OTP</label>
      <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        disabled={busy} aria-describedby={error ? "verification-error" : undefined}
        className="min-h-12 rounded-lg border border-[#d5deea] px-4 text-center text-xl tracking-[0.4em] focus:outline-2 focus:outline-[#2864dc]" />
      {error && <p id="verification-error" role="alert" className="text-sm text-[#9c2032]">{error}</p>}
      {notice && <p role="status" className="text-sm text-[#16715d]">{notice}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="min-h-12 rounded-lg bg-[#2864dc] px-4 font-semibold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : "Xác minh và tiếp tục"}</button>
      <button type="button" disabled={busy || remaining > 0} onClick={resend} className="text-sm text-[#2864dc] underline disabled:opacity-50">{remaining > 0 ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã"}</button>
      <button type="button" disabled={busy} onClick={onBack} className="text-sm text-[#69788e] underline">Quay lại đăng ký / đăng nhập</button>
    </form>
  </section>;
}
