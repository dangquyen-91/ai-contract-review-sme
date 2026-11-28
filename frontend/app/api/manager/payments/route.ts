import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { backendApiUrl } from "@/lib/api/backend";

const forwarded = ["page", "limit", "status", "purpose", "search"];

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "manager")
    return NextResponse.json({ success: false, error: { message: "Chỉ Manager được xem lịch sử giao dịch." } }, { status: 403 });
  const query = new URLSearchParams();
  for (const name of forwarded) {
    const value = request.nextUrl.searchParams.get(name);
    if (value !== null) query.set(name, value);
  }
  try {
    const upstream = await fetch(backendApiUrl(`/manager/payments?${query}`), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải lịch sử giao dịch. Vui lòng thử lại." } }, { status: 503 });
  }
}
