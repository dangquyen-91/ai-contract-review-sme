import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "./request-origin";

const idPattern = /^[a-f\d]{24}$/i;

export async function proxyExpertWorkspace(request: NextRequest, reviewId?: string, path: string[] = []) {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "expert") return NextResponse.json({ success: false, error: { message: "Chỉ chuyên gia được thực hiện thao tác này." } }, { status: 403 });
  let suffix: string;
  if (!reviewId) {
    const status = request.nextUrl.searchParams.get("status") ?? "all";
    if (request.method !== "GET" || !["all", "requested", "in_progress"].includes(status)) return NextResponse.json({ success: false, error: { message: "Bộ lọc không hợp lệ." } }, { status: 400 });
    suffix = `verification-queue?status=${status}`;
  } else {
    const operation = path.join("/");
    const allowed = (request.method === "GET" && operation === "workspace")
      || (request.method === "POST" && ["start", "findings", "approve", "return"].includes(operation))
      || (["PUT", "DELETE"].includes(request.method) && path.length === 2 && path[0] === "findings" && idPattern.test(path[1]));
    if (!idPattern.test(reviewId) || !allowed) return NextResponse.json({ success: false, error: { message: "Thao tác xác minh không hợp lệ." } }, { status: 400 });
    suffix = `${reviewId}/verification/${operation}`;
    if (request.method === "GET" && operation === "workspace") {
      const attempt = request.nextUrl.searchParams.get("attempt");
      if (attempt !== null) {
        if (!/^[1-9]\d{0,5}$/.test(attempt) || Number(attempt) > 100000) return NextResponse.json({ success: false, error: { message: "Lần xác minh không hợp lệ." } }, { status: 400 });
        suffix += `?attempt=${attempt}`;
      }
    }
  }
  if (request.method !== "GET" && !isSameOriginRequest(request)) return NextResponse.json({ success: false, error: { message: "Nguồn yêu cầu không hợp lệ." } }, { status: 403 });
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/${suffix}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${session.accessToken}`, ...(request.method !== "GET" ? { "Content-Type": "application/json" } : {}) },
      ...(["POST", "PUT"].includes(request.method) ? { body: (await request.text()) || "{}" } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    // Mutation responses may contain original finding text. Only the dedicated
    // redacted workspace is returned to the browser; reload it after writes.
    const payload = upstream.ok && request.method !== "GET" ? { success: true, data: null } : await upstream.json();
    return NextResponse.json(payload, { status: upstream.status === 204 ? 200 : upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa kết nối được dịch vụ xác minh. Hãy làm mới để kiểm tra kết quả trước khi thao tác lại." } }, { status: 503 });
  }
}
