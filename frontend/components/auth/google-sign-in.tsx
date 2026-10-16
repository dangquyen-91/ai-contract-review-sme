"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { apiRequest, isApiClientError } from "@/lib/api/client";
import { workspacePath } from "@/lib/workspace-path";

type GoogleIdentity = {
  initialize: (options: { client_id: string; nonce: string; callback: (result: { credential: string }) => void; auto_select: boolean; login_hint?: string }) => void;
  renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; width: number; locale: string }) => void;
};
type GoogleConfig = { clientId: string; nonce: string };
let setupRequest: Promise<GoogleConfig> | null = null;
function getGoogleConfig() {
  // Share concurrent mounts (including React Strict Mode) so the nonce cookie and response agree.
  if (!setupRequest) {
    setupRequest = apiRequest<GoogleConfig>({ url: "/auth/google", method: "GET" })
      .finally(() => { setupRequest = null; });
  }
  return setupRequest;
}

export function GoogleSignIn({ invitationToken, invitedEmail, remember = false, disabled = false, onBusyChange }: {
  invitationToken?: string; invitedEmail?: string; remember?: boolean; disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<{ clientId: string; nonce: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getGoogleConfig()
      .then((value) => { if (active) setConfig(value); })
      .catch(() => { if (active) setError("Đăng nhập Google chưa sẵn sàng. Bạn có thể dùng email bên dưới."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const identity = (window as unknown as { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
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
          const session = await authApi.google({ credential, nonce: config.nonce, invitationToken, remember });
          router.replace(invitationToken ? `/loi-moi?token=${invitationToken}` : workspacePath(session.user));
          router.refresh();
        } catch (err) {
          if (active) {
            const message = isApiClientError(err) ? err.message : "";
            setError(message === "Google sign-in is not configured"
              ? "Máy chủ chưa cấu hình đăng nhập Google. Vui lòng liên hệ quản trị viên."
              : message === "Google sign-in session expired. Reload this page."
                ? "Phiên đăng nhập Google đã hết hạn. Hãy tải lại trang và chọn tài khoản một lần nữa."
                : message === "Invalid Google credential"
                  ? "Không xác thực được tài khoản Google. Hãy tải lại trang và đăng nhập lại."
                  : message.includes("invitation") || message.includes("invited")
              ? "Hãy chọn đúng tài khoản Google có email nhận lời mời."
              : message.includes("existing account")
                ? "Email đã có tài khoản chưa xác minh. Hãy đăng nhập bằng mật khẩu bên dưới và xác minh OTP trước."
                : message.includes("email and password")
                  ? "Email này cần xác minh bằng cách đăng nhập hoặc đăng ký với mật khẩu bên dưới."
                  : "Không thể đăng nhập Google. Hãy thử lại hoặc tải lại trang.");
            setBusy(false);
            onBusyChange(false);
            inFlight.current = false;
          }
        }
      },
    });
    element.replaceChildren();
    identity.renderButton(element, { theme: "outline", size: "large", text: "signin_with", width: Math.min(400, element.clientWidth || 300), locale: "vi" });
    return () => { active = false; element.replaceChildren(); };
  }, [ready, config, invitedEmail, invitationToken, remember, disabled, router, onBusyChange]);

  return <div className="mt-6 grid gap-3">
    <Script src="https://accounts.google.com/gsi/client" onReady={() => setReady(true)} onError={() => setError("Không tải được Google. Hãy dùng email bên dưới hoặc tải lại trang.")} />
    <div inert={busy || disabled} aria-busy={busy} className={busy || disabled ? "opacity-60" : ""}>
      <div ref={host} className={`flex w-full justify-center ${ready && config ? "min-h-11" : ""}`} />
      {(!ready || !config) && <button type="button" disabled className="w-full rounded-lg border border-[#d5deea] py-3 text-sm text-[#69788e]">Đăng nhập với Google</button>}
    </div>
    {busy && <p role="status" className="text-center text-xs text-[#69788e]">Đang đăng nhập Google...</p>}
    {error && <p role="alert" className="text-center text-xs text-[#9c2032]">{error}</p>}
    <div className="flex items-center gap-3 text-xs text-[#69788e]"><span className="h-px flex-1 bg-[#e0e6ef]" />hoặc dùng email<span className="h-px flex-1 bg-[#e0e6ef]" /></div>
  </div>;
}
