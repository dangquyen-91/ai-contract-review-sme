import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

  try {
    const upstream = await fetch(`${apiBaseUrl}/api/v1/organizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể kết nối máy chủ LawScan. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
