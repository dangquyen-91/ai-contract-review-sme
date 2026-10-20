import { NextRequest, NextResponse } from "next/server";
import { encodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { rememberedCookieAge } from "@/lib/token-expiry";
import type { AuthSession } from "@/types/auth";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

  try {
    const upstream = await fetch(`${apiBaseUrl}/api/v1/auth/onboarding/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = await upstream.json();
    const response = NextResponse.json(payload, { status: upstream.status });

    if (upstream.ok) {
      const { user } = payload.data as AuthSession;
      const remember = request.cookies.get("lawscan_remember")?.value === "1";
      response.cookies.set(userSessionCookie, encodeSessionUser(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        ...rememberedCookieAge(remember, request.cookies.get("lawscan_refresh")?.value),
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ LawScan. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
