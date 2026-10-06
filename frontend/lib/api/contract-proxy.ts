import { NextRequest, NextResponse } from "next/server";

const objectIdPattern = /^[a-f\d]{24}$/i;

export async function proxyContractRequest(
  request: NextRequest,
  contractId: string,
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; findingId?: string } = {},
) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 });
  }
  if (!objectIdPattern.test(contractId) || (options.findingId && !objectIdPattern.test(options.findingId))) {
    return NextResponse.json({ success: false, error: { message: "Mã không hợp lệ." } }, { status: 400 });
  }

  try {
    const method = options.method ?? "GET";
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${contractId}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(method === "POST" || method === "PATCH" ? { "Content-Type": "application/json" } : {}),
        },
        ...(method === "POST" || method === "PATCH" ? { body: await request.text() } : {}),
        cache: "no-store",
      },
    );
    const payload = await upstream.json().catch(() => ({
      success: false,
      error: { message: "Máy chủ trả về dữ liệu không hợp lệ." },
    }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}

export async function proxyContractStream(request: NextRequest, contractId: string, path: string) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 });
  }
  if (!objectIdPattern.test(contractId)) {
    return NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${contractId}${path}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: await request.text(),
        cache: "no-store",
        signal: request.signal,
      },
    );
    if (!upstream.ok || !upstream.body) {
      const payload = await upstream.json().catch(() => ({
        success: false, error: { message: "Không thể bắt đầu luồng AI." },
      }));
      return NextResponse.json(payload, { status: upstream.status });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ." } }, { status: 503 });
  }
}
