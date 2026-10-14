import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/share-summary">) {
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Vui lòng đăng nhập." } }, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 });
  const query = new URLSearchParams();
  const expected = request.nextUrl.searchParams.get("expectedUpdatedAt");
  if (expected) query.set("expectedUpdatedAt", expected);
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/share-summary${query.size ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: request.signal,
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa tải được tóm tắt để chia sẻ." } }, { status: 503 });
  }
}
