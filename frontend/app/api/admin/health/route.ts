import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { backendApiUrl } from "@/lib/api/backend";

export async function GET() {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    if (session.user.role !== "administrator")
      return NextResponse.json(
        { success: false, error: { message: "Bạn không có quyền quản trị." } },
        { status: 403 },
      );
    const upstream = await fetch(
      backendApiUrl(`/health`),
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    const payload = await upstream.json();
    if (!upstream.ok || payload.data?.status !== "ok")
      throw new Error("Unavailable");
    return NextResponse.json({ success: true, data: { status: "ok" } });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Không thể xác nhận kết nối máy chủ lúc này." },
      },
      { status: 503 },
    );
  }
}
