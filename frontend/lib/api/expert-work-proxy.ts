import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";

export async function proxyMyExpertWork(request: NextRequest) {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "expert") return NextResponse.json({ success: false, error: { message: "Chỉ chuyên gia được xem công việc cá nhân." } }, { status: 403 });
  const query = new URLSearchParams();
  for (const key of ["status", "search", "type", "from", "to", "page", "limit"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/my-verifications?${query}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa tải được công việc của bạn. Vui lòng thử lại." } }, { status: 503 });
  }
}
