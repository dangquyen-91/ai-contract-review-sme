import { NextRequest, NextResponse } from "next/server";

const allowedActions = new Set(["login", "register"]);

export async function POST(request: NextRequest, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json({ success: false, error: { message: "Endpoint không hợp lệ." } }, { status: 404 });
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  try {
    const requestBody = await request.json();
    const remember = action === "login" && requestBody.remember === true;
    const { remember: _remember, ...upstreamBody } = requestBody;
    void _remember;
    const upstream = await fetch(`${apiBaseUrl}/api/v1/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
    });
    const payload = await upstream.json();
    if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });

    const { accessToken, refreshToken, user } = payload.data;
    const response = NextResponse.json({ success: true, data: { user } });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("lawscan_access", accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 15 * 60 });
    response.cookies.set("lawscan_refresh", refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/", ...(remember ? { maxAge: 7 * 24 * 60 * 60 } : {}) });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ LawScan. Hãy kiểm tra backend đang chạy." } },
      { status: 503 },
    );
  }
}
