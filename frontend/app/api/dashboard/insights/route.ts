import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { dashboardInsightsQuerySchema } from "@/schemas/dashboard-insights.schema";
import { backendApiUrl } from "@/lib/api/backend";

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  const parsed = dashboardInsightsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: "Kỳ thống kê không hợp lệ." } },
      { status: 400 },
    );
  }
  try {
    const query = new URLSearchParams(parsed.data);
    const upstream = await fetch(
      backendApiUrl(`/dashboard/insights?${query}`),
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
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
        error: { message: "Chưa tải được thống kê. Vui lòng thử lại." },
      },
      { status: 503 },
    );
  }
}
