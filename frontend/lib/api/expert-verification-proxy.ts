import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "@/lib/api/request-origin";

export async function proxyExpertVerification(request: NextRequest, reviewId: string, action: "get" | "request") {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!["owner", "manager", "staff", "user"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: { message: "Vai trò hiện tại không được gửi yêu cầu xác minh." } }, { status: 403 });
  }
  if (!/^[a-f\d]{24}$/i.test(reviewId)) {
    return NextResponse.json({ success: false, error: { message: "Mã lượt rà soát không hợp lệ." } }, { status: 400 });
  }
  if (action === "request" && !isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: { message: "Nguồn yêu cầu không hợp lệ." } }, { status: 403 });
  }
  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/${reviewId}/verification${action === "request" ? "/request" : ""}`,
      {
        method: action === "request" ? "POST" : "GET",
        headers: { Authorization: `Bearer ${session.accessToken}`, ...(action === "request" ? { "Content-Type": "application/json" } : {}) },
        ...(action === "request" ? { body: await request.text() } : {}),
        cache: "no-store",
      },
    );
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa kết nối được dịch vụ xác minh. Hãy kiểm tra trạng thái trước khi thử gửi lại." } }, { status: 503 });
  }
}
