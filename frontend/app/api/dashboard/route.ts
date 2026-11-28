import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { backendApiUrl } from "@/lib/api/backend";

export async function GET() {
  const session = await getApiSession();
  if (session.error) return session.error;
  try {
    const upstream = await fetch(
      backendApiUrl(`/dashboard`),
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      },
    );
    return NextResponse.json(await upstream.json(), {
      status: upstream.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Không thể tải dữ liệu dashboard. Vui lòng thử lại.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
