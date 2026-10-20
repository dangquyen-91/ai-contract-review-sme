import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json() as { token?: string };
    if (!token || !/^[a-f\d]{64}$/.test(token)) return NextResponse.json({ success: false, error: { message: "Liên kết lời mời không hợp lệ." } }, { status: 400 });
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/invitations/preview`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store",
    });
    const response = NextResponse.json(await upstream.json(), { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải lời mời." } }, { status: 503 });
  }
}
