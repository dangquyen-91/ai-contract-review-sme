import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "@/lib/api/request-origin";
import { backendApiUrl } from "@/lib/api/backend";

export async function proxyExpertConsultation(request: NextRequest, reviewId: string, method: "GET" | "POST") {
  const session = await getApiSession();
  if (session.error) return session.error;
  const error = (message: string, status: number) => NextResponse.json(
    { success: false, error: { message } }, { status, headers: { "Cache-Control": "no-store" } },
  );
  if (!["owner", "staff", "user", "expert"].includes(session.user.role)) return error("Vai trò hiện tại không có quyền trao đổi với chuyên gia.", 403);
  if (!/^[a-f\d]{24}$/i.test(reviewId)) return error("Mã lượt rà soát không hợp lệ.", 400);
  if (method === "POST" && !isSameOriginRequest(request)) return error("Nguồn yêu cầu không hợp lệ.", 403);
  const params = new URLSearchParams();
  if (method === "GET") {
    for (const name of ["attempt", "limit", "before", "after"]) {
      const value = request.nextUrl.searchParams.get(name);
      if (value !== null) params.set(name, value);
    }
  }
  try {
    const response = await fetch(
      backendApiUrl(`/reviews/${reviewId}/verification/messages${params.size ? `?${params}` : ""}`),
      {
        method,
        headers: { Authorization: `Bearer ${session.accessToken}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
        ...(method === "POST" ? { body: await request.text() } : {}),
        cache: "no-store", signal: AbortSignal.timeout(15000),
      },
    );
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return error("Chưa kết nối được dịch vụ trao đổi. Nếu vừa gửi tin, hãy tải lại lịch sử hoặc gửi lại cùng tin nhắn.", 503);
  }
}
