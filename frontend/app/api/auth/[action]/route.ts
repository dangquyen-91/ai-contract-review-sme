import { NextRequest, NextResponse } from "next/server";

const allowedActions = new Set(["login", "register", "refresh", "logout"]);
const accessTokenMaxAge = 15 * 60;
const refreshTokenMaxAge = 7 * 24 * 60 * 60;

function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
}

function clearSessionCookies(response: NextResponse, secure: boolean) {
  const options = { ...cookieOptions(secure), maxAge: 0 };
  response.cookies.set("lawscan_access", "", options);
  response.cookies.set("lawscan_refresh", "", options);
  response.cookies.set("lawscan_remember", "", options);
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
    const remember = isRefresh
      ? request.cookies.get("lawscan_remember")?.value === "1"
      : action === "login" && requestBody.remember === true;
    const refreshToken = request.cookies.get("lawscan_refresh")?.value;

    if (isRefresh && !refreshToken) {
      const response = NextResponse.json(
        { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
        { status: 401 },
      );
      clearSessionCookies(response, secure);
      return response;
    }

    const { remember: _remember, ...credentials } = requestBody;
    void _remember;
    const upstreamBody = isRefresh ? { refreshToken } : credentials;
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

    const { accessToken, refreshToken: nextRefreshToken, user } = payload.data;
    const response = NextResponse.json({
      success: true,
      data: isRefresh ? { refreshed: true } : { user },
    });
    const options = cookieOptions(secure);
    response.cookies.set("lawscan_access", accessToken, { ...options, maxAge: accessTokenMaxAge });
    response.cookies.set("lawscan_refresh", nextRefreshToken, {
      ...options,
      ...(remember ? { maxAge: refreshTokenMaxAge } : {}),
    });
    response.cookies.set("lawscan_remember", remember ? "1" : "0", {
      ...options,
      ...(remember ? { maxAge: refreshTokenMaxAge } : {}),
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ LawScan. Hãy kiểm tra backend đang chạy." } },
      { status: 503 },
    );
  }
}
