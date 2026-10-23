import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";
import { encodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { rememberedCookieAge, tokenMaxAge } from "@/lib/token-expiry";
import type { AuthUser } from "@/types/auth";
import { isSameOriginRequest } from "@/lib/request-origin";

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  const accessToken = session.accessToken;
  if (!isSameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  try {
    const { token, invitationId } = await request.json() as { token?: string; invitationId?: string };
    if (invitationId ? !/^[a-f\d]{24}$/i.test(invitationId) : !token || !/^[a-f\d]{64}$/.test(token)) return NextResponse.json({ success: false, error: { message: "Liên kết lời mời không hợp lệ." } }, { status: 400 });
    const endpoint = invitationId ? `received/${invitationId}/accept` : "accept";
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/invitations/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ token }), cache: "no-store",
    });
    const payload = await upstream.json();
    const response = NextResponse.json(upstream.ok ? { success: true, data: { user: payload.data.user } } : payload, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (upstream.ok) {
      const { user, accessToken: nextAccess, refreshToken } = payload.data as { user: AuthUser; accessToken: string; refreshToken: string };
      const remember = request.cookies.get("lawscan_remember")?.value === "1";
      const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
      response.cookies.set("lawscan_access", nextAccess, { ...options, maxAge: tokenMaxAge(nextAccess) });
      response.cookies.set("lawscan_refresh", refreshToken, { ...options, ...rememberedCookieAge(remember, refreshToken) });
      response.cookies.set(userSessionCookie, encodeSessionUser(user), { ...options, ...rememberedCookieAge(remember, refreshToken) });
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ LawScan." } }, { status: 503 });
  }
}
