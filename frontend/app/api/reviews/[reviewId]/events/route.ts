import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/reviews/[reviewId]/events">) {
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 });
  const { reviewId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(reviewId)) return NextResponse.json({ success: false, error: { message: "Mã lượt rà soát không hợp lệ." } }, { status: 400 });
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/${reviewId}/events`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" }, cache: "no-store", signal: request.signal,
    });
    if (!upstream.ok || !upstream.body) return NextResponse.json(await upstream.json(), { status: upstream.status });
    return new Response(upstream.body, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối luồng rà soát." } }, { status: 503 });
  }
}
