import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { reportQuerySchema } from "@/schemas/report.schema";

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!["administrator", "owner"].includes(session.user.role))
    return NextResponse.json(
      { success: false, error: { message: "Bạn không có quyền xem báo cáo." } },
      { status: 403 },
    );
  const parsed = reportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: { message: "Bộ lọc báo cáo không hợp lệ." } },
      { status: 400 },
    );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.data))
    if (value !== undefined) query.set(key, String(value));
  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reports?${query}`,
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
        error: { message: "Chưa tải được báo cáo. Hãy thử lại." },
      },
      { status: 503 },
    );
  }
}
