import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "@/lib/api/request-origin";
import { backendApiUrl } from "@/lib/api/backend";

export async function proxyExpertVerification(request: NextRequest, reviewId: string, action: "get" | "request" | "share-original") {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!["owner", "staff", "user"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: { message: "Vai trò hiện tại không được gửi yêu cầu xác minh." } }, { status: 403 });
  }
  if (!/^[a-f\d]{24}$/i.test(reviewId)) {
    return NextResponse.json({ success: false, error: { message: "Mã lượt rà soát không hợp lệ." } }, { status: 400 });
  }
  const writing = action !== "get";
  if (writing && !isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: { message: "Nguồn yêu cầu không hợp lệ." } }, { status: 403 });
  }
  try {
    const upstream = await fetch(
      backendApiUrl(`/reviews/${reviewId}/verification${writing ? `/${action}` : ""}`),
      {
        method: writing ? "POST" : "GET",
        headers: { Authorization: `Bearer ${session.accessToken}`, ...(writing ? { "Content-Type": "application/json" } : {}) },
        ...(writing ? { body: await request.text() } : {}),
        cache: "no-store",
      },
    );
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa kết nối được dịch vụ xác minh. Hãy kiểm tra trạng thái trước khi thử gửi lại." } }, { status: 503 });
  }
}
