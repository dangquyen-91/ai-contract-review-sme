import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-origin";

export async function proxyPayment(request: NextRequest, orgId: string, orderCode?: string, action?: "sync" | "cancel") {
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Vui lòng đăng nhập để quản lý thanh toán." } }, { status: 401 });
  if (!/^[a-f\d]{24}$/i.test(orgId) || (orderCode !== undefined && (!/^[1-9]\d{0,15}$/.test(orderCode) || !Number.isSafeInteger(Number(orderCode))))) {
    return NextResponse.json({ success: false, error: { message: "Mã thanh toán không hợp lệ." } }, { status: 400 });
  }
  // Browser mutations must originate from this application. Provider webhooks go directly to BE.
  if (request.method === "POST" && !isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: { message: "Nguồn yêu cầu không hợp lệ." } }, { status: 403 });
  }
  const suffix = orderCode ? `/${orderCode}${action ? `/${action}` : ""}` : "";
  const query = request.method === "GET" && !orderCode ? `?${new URLSearchParams({ page: request.nextUrl.searchParams.get("page") ?? "1" })}` : "";
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    if (!orderCode && request.method === "POST") {
      const key = request.headers.get("Idempotency-Key");
      if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key)) return NextResponse.json({ success: false, error: { message: "Thiếu mã yêu cầu thanh toán." } }, { status: 400 });
      headers["Idempotency-Key"] = key;
    }
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/${orgId}/payments${suffix}${query}`, {
      method: request.method, headers,
      ...(request.method === "POST" && !orderCode ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(30_000), cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa xác nhận được kết quả. Kiểm tra lịch sử đơn trước khi thử thanh toán lại." } }, { status: 503 });
  }
}
