"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { clearSessionCache } from "@/lib/auth/session-cache";
import { authApi } from "@/lib/api/auth";
import { apiRequest, isApiClientError } from "@/lib/api/client";
import { authDestination } from "@/lib/auth/auth-return";
import type { GoogleSignInOptions } from "@/types/auth";
type GoogleCredential = { credential: string; state?: string };
type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (result: GoogleCredential) => void;
    auto_select: boolean;
    button_auto_select: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme: string;
      size: string;
      text: string;
      width: number;
      locale: string;
      state: string;
    },
  ) => void;
};
type GoogleConfig = { clientId: string; nonce: string };
type GoogleClient = {
  nextButtonId: number;
  handlers: Map<string, (result: GoogleCredential) => void>;
};
type GooglePageState = {
  setupRequest: Promise<GoogleConfig> | null;
  expiresAt: number;
  consumed: boolean;
  inFlight: boolean;
  clients: WeakMap<GoogleIdentity, GoogleClient>;
};
function getGooglePageState() {
  // GIS belongs to the document, so keep its state across form remounts and
  // development Fast Refresh as well. Nothing is persisted across page loads.
  const page = window as unknown as { __lawscanGoogleSignIn?: GooglePageState };
  return (page.__lawscanGoogleSignIn ??= {
    setupRequest: null,
    expiresAt: Infinity,
    consumed: false,
    inFlight: false,
    clients: new WeakMap(),
  });
}
function needsNewGoogleSession(page: GooglePageState) {
  return page.consumed || Date.now() >= page.expiresAt;
}
function getGoogleConfig() {
  const page = getGooglePageState();
  // Retain successful setup: fetching again rotates the HttpOnly nonce cookie
  // while the document's Google client still uses the original nonce.
  if (!page.setupRequest) {
    const startedAt = Date.now();
    page.setupRequest = apiRequest<GoogleConfig>({
      url: "/auth/google",
      method: "GET",
    }).then((config) => {
      // Match the nonce cookie's 600-second lifetime in /api/auth/[action].
      page.expiresAt = startedAt + 600_000;
      return config;
    }).catch((error) => {
      page.setupRequest = null;
      throw error;
    });
  }
  return page.setupRequest;
}
function getGoogleClient(identity: GoogleIdentity, config: GoogleConfig) {
  const page = getGooglePageState();
  let client = page.clients.get(identity);
  if (!client) {
    const handlers = new Map<string, (result: GoogleCredential) => void>();
    client = { nextButtonId: 0, handlers };
    identity.initialize({
      client_id: config.clientId,
      nonce: config.nonce,
      auto_select: false,
      button_auto_select: false,
      // Invitation details belong to the current handler. A global login_hint
      // would become stale when navigating to a different invitation.
      callback: (result) => {
        if (result.state) handlers.get(result.state)?.(result);
      },
    });
    page.clients.set(identity, client);
  }
  return client;
}

export function useGoogleSignIn({
  invitationToken,
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
    const page = getGooglePageState();
    if (page.setupRequest && needsNewGoogleSession(page)) {
      // A consumed/expired nonce needs a fresh document and GIS client too.
      window.location.reload();
      return;
    }
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

  // Read current form options without restarting the Google client or invalidating
  // a pending credential exchange when remember/disabled changes.
  const handleCredential = useEffectEvent(async (
    { credential }: { credential: string },
    nonce: string,
    isActive: () => boolean,
  ) => {
    if (!isActive() || inFlight.current || disabled) return;
    const page = getGooglePageState();
    if (page.inFlight) return;
    if (needsNewGoogleSession(page)) {
      window.location.reload();
      return;
    }
    page.inFlight = true;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const session = await authApi.google({
        credential,
        nonce,
        invitationToken,
        remember,
      });
      page.consumed = true;
      await clearSessionCache(queryClient);
      router.replace(
        authDestination(session.user, invitationToken, returnTo),
      );
      router.refresh();
    } catch (err) {
      if (isActive()) {
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
    } finally {
      page.inFlight = false;
    }
  });

  useEffect(() => {
    const identity = (
      window as unknown as { google?: { accounts: { id: GoogleIdentity } } }
    ).google?.accounts.id;
    const element = host.current;
    if (!ready || !config || !identity || !element) return;
    let active = true;
    const client = getGoogleClient(identity, config);
    const buttonState = `lawscan-google-${++client.nextButtonId}`;
    client.handlers.set(buttonState, (result) => {
      if (active) void handleCredential(result, config.nonce, () => active);
    });
    element.replaceChildren();
    identity.renderButton(element, {
      theme: "outline",
      // Google medium buttons do not display a remembered account's identity.
      size: "medium",
      text: "signin_with",
      width: Math.min(400, element.clientWidth || 300),
      locale: "vi",
      state: buttonState,
    });
    return () => {
      active = false;
      client.handlers.delete(buttonState);
      element.replaceChildren();
    };
  }, [ready, config]);

  return {
    host,
    ready,
    configured: Boolean(config),
    error,
    busy,
    onReady: () => setReady(true),
    onScriptError: () =>
      setError(
        "Không tải được Google. Hãy dùng email bên dưới hoặc tải lại trang.",
      ),
  };
}
