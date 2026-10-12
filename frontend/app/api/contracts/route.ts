import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) return NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 });
  const params = new URLSearchParams();
  for (const key of ["page", "limit", "status", "riskLevel", "search", "sortBy", "sortOrder"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải danh sách hợp đồng. Vui lòng thử lại." } }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("lawscan_access")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { message: "Phiên đăng nhập đã hết hạn." } },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, Prefer: "respond-async" },
      body: await request.formData(),
      cache: "no-store",
    });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể tải hợp đồng lên. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
