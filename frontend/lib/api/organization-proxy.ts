import { NextRequest, NextResponse } from "next/server";

export async function proxyOrganizationMutation(request: NextRequest, id: string, suffix = "") {
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 });
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: { message: "Mã tổ chức không hợp lệ." } }, { status: 400 });
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/${id}${suffix}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(request.method !== "DELETE" ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ. Vui lòng thử lại." } }, { status: 503 });
  }
}
