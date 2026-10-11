import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { mutateLegalSource } from "@/lib/api/legal-source-proxy";

export async function POST(request: Request) {
  return mutateLegalSource(request);
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session)
      return NextResponse.json(
        { success: false, error: { message: "Vui lòng đăng nhập lại." } },
        { status: 401 },
      );
    if (session.role !== "administrator")
      return NextResponse.json(
        { success: false, error: { message: "Bạn không có quyền quản trị." } },
        { status: 403 },
      );
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/kb/legal-sources`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Không thể tải kho pháp lý. Vui lòng thử lại." },
      },
      { status: 503 },
    );
  }
}
