import { NextRequest, NextResponse } from "next/server";
import { encodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { rememberedCookieAge } from "@/lib/token-expiry";
import { getApiSession } from "@/lib/auth/api-session";

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    if (session.user.role !== "manager") return NextResponse.json(
      { success: false, error: { message: "Bạn không có quyền xem danh sách tổ chức." } },
      { status: 403 },
    );
    const query = new URLSearchParams();
    for (const key of ["page", "limit", "search", "industry"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value !== null) query.set(key, value);
    }
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations?${query}`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể tải danh sách tổ chức. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  const accessToken = session.accessToken;

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

  try {
    const upstream = await fetch(`${apiBaseUrl}/api/v1/organizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const payload = await upstream.json();
    const response = NextResponse.json(payload, { status: upstream.status });

    if (upstream.ok && typeof payload.data?.id === "string") {
      const user = session.user;
      const remember = request.cookies.get("lawscan_remember")?.value === "1";
      response.cookies.set(userSessionCookie, encodeSessionUser({
        ...user,
        role: "owner",
        orgId: payload.data.id,
        hasCompletedOnboarding: true,
      }), {
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
