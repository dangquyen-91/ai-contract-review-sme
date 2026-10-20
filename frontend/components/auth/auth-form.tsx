"use client";
import Link from "next/link";
import { useAuthInvitation } from "@/hooks/use-auth-invitation";
import { safeAuthReturn } from "@/lib/auth-return";
import { AuthFormContent } from "./auth-form-content";
import type { AuthFormProps } from "@/types/auth";
export function AuthForm({ mode, invitationToken, returnTo }: AuthFormProps) {
  const { hasInvitation, validToken, preview, failure } =
    useAuthInvitation(invitationToken);

  if (hasInvitation) {
    if (validToken && preview.isPending) {
      return (
        <p role="status" className="text-sm text-[#69788e]">
          Đang kiểm tra email nhận lời mời...
        </p>
      );
    }
    if (!validToken || preview.isError || !preview.data) {
      return (
        <div className="grid max-w-[460px] gap-4 text-sm">
          <p role="alert" className="text-[#9c2032]">
            {validToken
              ? failure.message
              : "Liên kết lời mời không hợp lệ. Hãy mở lại link đầy đủ trong email hoặc liên hệ Owner."}
          </p>
          {validToken && failure.retryable && (
            <button
              type="button"
              disabled={preview.isFetching}
              onClick={() => void preview.refetch()}
              className="text-[#0868ed] underline disabled:opacity-60"
            >
              {preview.isFetching ? "Đang kiểm tra..." : "Thử lại"}
            </button>
          )}
          <Link href="/dang-nhap" className="text-[#0868ed] underline">
            Về trang đăng nhập
          </Link>
        </div>
      );
    }
  }

  return (
    <AuthFormContent
      key={`${mode}:${invitationToken ?? ""}:${preview.data?.email ?? ""}`}
      mode={mode}
      invitationToken={invitationToken}
      invitedEmail={hasInvitation ? preview.data?.email : undefined}
      returnTo={safeAuthReturn(returnTo) ?? undefined}
    />
  );
}
