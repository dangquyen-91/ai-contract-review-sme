"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearSessionCache } from "@/lib/session-cache";
import { authApi } from "@/lib/api/auth";
import { apiRequest, isApiClientError } from "@/lib/api/client";
import { authDestination } from "@/lib/auth-return";
import type { GoogleSignInOptions } from "@/types/auth";
type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (result: { credential: string }) => void;
    auto_select: boolean;
    login_hint?: string;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme: string;
      size: string;
      text: string;
      width: number;
      locale: string;
    },
  ) => void;
};
type GoogleConfig = { clientId: string; nonce: string };
let setupRequest: Promise<GoogleConfig> | null = null;
function getGoogleConfig() {
  // Share concurrent mounts (including React Strict Mode) so the nonce cookie and response agree.
  if (!setupRequest) {
    setupRequest = apiRequest<GoogleConfig>({
      url: "/auth/google",
      method: "GET",
    }).finally(() => {
      setupRequest = null;
    });
  }
  return setupRequest;
}

export function useGoogleSignIn({
  invitationToken,
  invitedEmail,
  returnTo,
  remember = false,
  disabled = false,
  onBusyChange,
}: GoogleSignInOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const host = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<{
    clientId: string;
    nonce: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getGoogleConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Đăng nhập Google chưa sẵn sàng. Bạn có thể dùng email bên dưới.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const identity = (
      window as unknown as { google?: { accounts: { id: GoogleIdentity } } }
    ).google?.accounts.id;
    const element = host.current;
    if (!ready || !config || !identity || !element) return;
    let active = true;
    identity.initialize({
      client_id: config.clientId,
      nonce: config.nonce,
      auto_select: false,
      login_hint: invitedEmail,
      callback: async ({ credential }) => {
        if (!active || inFlight.current || disabled) return;
        inFlight.current = true;
        setBusy(true);
        onBusyChange(true);
        setError("");
        try {
          const session = await authApi.google({
            credential,
            nonce: config.nonce,
            invitationToken,
            remember,
          });
          await clearSessionCache(queryClient);
          router.replace(
            authDestination(session.user, invitationToken, returnTo),
          );
          router.refresh();
        } catch (err) {
          if (active) {
            const message = isApiClientError(err) ? err.message : "";
            setError(
              message === "Google sign-in is not configured"
                ? "Máy chủ chưa cấu hình đăng nhập Google. Vui lòng liên hệ quản trị viên."
                : message ===
                    "Google sign-in session expired. Reload this page."
                  ? "Phiên đăng nhập Google đã hết hạn. Hãy tải lại trang và chọn tài khoản một lần nữa."
                  : message === "Invalid Google credential"
                    ? "Không xác thực được tài khoản Google. Hãy tải lại trang và đăng nhập lại."
                    : message.includes("invitation") ||
                        message.includes("invited")
                      ? "Hãy chọn đúng tài khoản Google có email nhận lời mời."
                      : message.includes("existing account")
                        ? "Email đã có tài khoản chưa xác minh. Hãy đăng nhập bằng mật khẩu bên dưới và xác minh OTP trước."
                        : message.includes("email and password")
                          ? "Email này cần xác minh bằng cách đăng nhập hoặc đăng ký với mật khẩu bên dưới."
                          : "Không thể đăng nhập Google. Hãy thử lại hoặc tải lại trang.",
            );
            setBusy(false);
            onBusyChange(false);
            inFlight.current = false;
          }
        }
      },
    });
    element.replaceChildren();
    identity.renderButton(element, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      width: Math.min(400, element.clientWidth || 300),
      locale: "vi",
    });
    return () => {
      active = false;
      element.replaceChildren();
    };
  }, [
    ready,
    config,
    invitedEmail,
    invitationToken,
    returnTo,
    remember,
    disabled,
    router,
    onBusyChange,
    queryClient,
  ]);

  return {
    host,
    ready,
    configured: Boolean(config),
    error,
    busy,
    onReady: () => setReady(true),
    onScriptError: () =>
      setError(
        "Kh?ng t?i ???c Google. H?y d?ng email b?n d??i ho?c t?i l?i trang.",
      ),
  };
}
