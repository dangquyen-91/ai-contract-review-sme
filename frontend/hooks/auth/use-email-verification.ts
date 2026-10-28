"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearSessionCache } from "@/lib/session-cache";
import { authApi } from "@/lib/api/auth";
import { isApiClientError } from "@/lib/api/client";
import { authDestination } from "@/lib/auth-return";
import type { EmailVerificationOptions } from "@/types/auth";
function errorMessage(error: unknown) {
  if (!isApiClientError(error))
    return "Không thể xác minh lúc này. Vui lòng thử lại.";
  if (error.status === 429)
    return "Bạn đã thử quá nhiều lần. Vui lòng đợi trước khi gửi lại mã.";
  if (error.message === "Incorrect verification code")
    return "Mã OTP chưa đúng. Vui lòng kiểm tra email.";
  if (
    error.message.includes("expired") ||
    error.message.includes("unavailable")
  )
    return "Mã OTP đã hết hạn hoặc không còn hiệu lực. Hãy gửi lại mã.";
  if (error.message.includes("Invitation"))
    return "Lời mời không còn hợp lệ. Hãy mở lại link hoặc liên hệ Owner.";
  if (error.message === "Email already registered")
    return "Email đã có tài khoản. Hãy quay lại đăng nhập.";
  if (!error.status || error.status >= 500)
    return "Không thể kết nối hoặc gửi email lúc này. Vui lòng thử lại.";
  return "Không thể xác minh. Hãy kiểm tra mã hoặc quay lại đăng nhập để bắt đầu lại.";
}

export function useEmailVerification({
  initialChallenge,
  invitationToken,
  returnTo,
}: EmailVerificationOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useState(initialChallenge);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(
    initialChallenge.resendAfterSeconds,
  );
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Vui lòng nhập đủ 6 chữ số trong email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await authApi.verifyEmail({
        challengeId: challenge.challengeId,
        code,
        invitationToken,
      });
      await clearSessionCache(queryClient);
      router.replace(authDestination(session.user, invitationToken, returnTo));
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
      const next = await authApi.resendVerification({
        challengeId: challenge.challengeId,
        invitationToken,
      });
      setChallenge(next);
      setCode("");
      setRemaining(next.resendAfterSeconds);
      setNotice("Đã gửi mã mới. Vui lòng dùng mã trong email mới nhất.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    email: challenge.email,
    code,
    setCode,
    error,
    notice,
    busy,
    remaining,
    verify,
    resend,
  };
}
