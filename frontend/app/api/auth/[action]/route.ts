import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { encodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { rememberedCookieAge, tokenMaxAge } from "@/lib/token-expiry";
import type { AuthUser } from "@/types/auth";
import { isSameOriginRequest } from "@/lib/request-origin";

const allowedActions = new Set(["login", "register", "refresh", "logout", "verify-email", "resend-verification", "google"]);

export async function GET(request: NextRequest, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (action !== "google") return NextResponse.json({ success: false }, { status: 404 });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ success: false, error: { message: "Google sign-in is not configured" } }, { status: 503 });
  const nonce = randomBytes(32).toString("hex");
  const response = NextResponse.json({ success: true, data: { clientId, nonce } });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set("lawscan_google_nonce", nonce, { ...cookieOptions(process.env.NODE_ENV === "production"), maxAge: 600 });
  return response;
}

function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
}

function clearSessionCookies(response: NextResponse, secure: boolean) {
  const options = { ...cookieOptions(secure), maxAge: 0 };
  response.cookies.set("lawscan_access", "", options);
  response.cookies.set("lawscan_refresh", "", options);
  response.cookies.set("lawscan_remember", "", options);
  response.cookies.set(userSessionCookie, "", options);
}

export async function POST(request: NextRequest, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json({ success: false, error: { message: "Endpoint không hợp lệ." } }, { status: 404 });
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const secure = process.env.NODE_ENV === "production";

  if (action === "logout") {
    const response = NextResponse.json({ success: true, data: { loggedOut: true } });
    clearSessionCookies(response, secure);
    return response;
  }

  try {
    const isRefresh = action === "refresh";
    const requestBody = isRefresh ? {} : await request.json();
    if (action === "google") {
      const nonce = request.cookies.get("lawscan_google_nonce")?.value;
      if (!isSameOriginRequest(request) || !nonce || requestBody.nonce !== nonce) {
        return NextResponse.json({ success: false, error: { message: "Google sign-in session expired. Reload this page." } }, { status: 403 });
      }
    }
    let remember = isRefresh
      ? request.cookies.get("lawscan_remember")?.value === "1"
      : (action === "login" || action === "google") && requestBody.remember === true;
    const refreshToken = request.cookies.get("lawscan_refresh")?.value;

    if (isRefresh && !refreshToken) {
      const response = NextResponse.json(
        { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
        { status: 401 },
      );
      clearSessionCookies(response, secure);
      return response;
    }

    const upstreamBody = isRefresh ? { refreshToken } : requestBody;
    const upstream = await fetch(`${apiBaseUrl}/api/v1/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      const response = NextResponse.json(payload, { status: upstream.status });
      if (isRefresh && upstream.status === 401) clearSessionCookies(response, secure);
      return response;
    }

    if (payload.data?.verificationRequired === true) {
      const response = NextResponse.json(payload, { status: upstream.status });
      response.headers.set("Cache-Control", "no-store");
      // A pending verification is not an authenticated session.
      if (action !== "resend-verification") clearSessionCookies(response, secure);
      return response;
    }
    if (action === "verify-email") remember = payload.data?.remember === true;

    const { accessToken, refreshToken: nextRefreshToken, user } = payload.data as {
      accessToken: string;
      refreshToken: string;
      user?: AuthUser;
    };
    const response = NextResponse.json({
      success: true,
      data: isRefresh ? { refreshed: true } : { user },
    });
    response.headers.set("Cache-Control", "no-store");
    const options = cookieOptions(secure);
    if (action === "google") response.cookies.set("lawscan_google_nonce", "", { ...options, maxAge: 0 });
    response.cookies.set("lawscan_access", accessToken, { ...options, maxAge: tokenMaxAge(accessToken) });
    response.cookies.set("lawscan_refresh", nextRefreshToken, {
      ...options,
      ...rememberedCookieAge(remember, nextRefreshToken),
    });
    response.cookies.set("lawscan_remember", remember ? "1" : "0", {
      ...options,
      ...rememberedCookieAge(remember, nextRefreshToken),
    });
    if (user) {
      response.cookies.set(userSessionCookie, encodeSessionUser(user), {
        ...options,
        ...rememberedCookieAge(remember, nextRefreshToken),
      });
    }
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ LawScan." } },
      { status: 503 },
    );
  }
}
