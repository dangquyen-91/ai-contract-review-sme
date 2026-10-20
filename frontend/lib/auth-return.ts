import type { AuthUser } from "@/types/auth";
import { workspacePath } from "./workspace-path";
import { planCodes } from "@/types/subscription";

// Keep payment context across password, Google and OTP sign-in without open redirects.
export function safeAuthReturn(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://lawscan.invalid");
    if (url.origin !== "https://lawscan.invalid") return null;
    if (url.pathname === "/goi-dich-vu/xac-nhan") {
      const plan = url.searchParams.get("plan");
      return planCodes.some(code => code === plan) ? `/goi-dich-vu/xac-nhan?plan=${plan}` : null;
    }
    if (["/thanh-toan/ket-qua", "/thanh-toan/huy"].includes(url.pathname)) {
      const code = url.searchParams.get("orderCode") ?? "";
      return /^[1-9]\d{0,15}$/.test(code) && Number.isSafeInteger(Number(code)) ? `${url.pathname}?orderCode=${code}` : null;
    }
  } catch { /* Untrusted redirect target. */ }
  return null;
}

export function authDestination(user: AuthUser, invitationToken?: string, returnTo?: string) {
  return invitationToken ? `/loi-moi?token=${invitationToken}` : safeAuthReturn(returnTo) ?? workspacePath(user);
}

export function emailVerificationNavigation(mode: "login" | "register", invitationToken?: string, returnTo?: string) {
  const query = new URLSearchParams();
  if (invitationToken && /^[a-f\d]{64}$/.test(invitationToken)) query.set("invitationToken", invitationToken);
  const destination = safeAuthReturn(returnTo);
  if (destination) query.set("returnTo", destination);
  const backQuery = query.toString();
  query.set("mode", mode);
  return {
    verificationHref: `/xac-minh-email?${query}`,
    backHref: `${mode === "register" ? "/dang-ky" : "/dang-nhap"}${backQuery ? `?${backQuery}` : ""}`,
  };
}
