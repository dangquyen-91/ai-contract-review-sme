import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { mutateLegalSource } from "@/lib/api/legal-source-proxy";
import { backendApiUrl } from "@/lib/api/backend";

export async function POST(request: Request) {
  return mutateLegalSource(request);
}

export async function GET() {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    if (session.user.role !== "manager")
      return NextResponse.json(
        { success: false, error: { message: "Bạn không có quyền quản lý kho pháp lý." } },
        { status: 403 },
      );
    const upstream = await fetch(
      backendApiUrl(`/kb/legal-sources`),
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
