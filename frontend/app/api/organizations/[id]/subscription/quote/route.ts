import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { planCodes } from "@/types/subscription";

// Server-side plan checkout quote: action and price (with upgrade credit) for one plan.
export async function GET(request: NextRequest, context: RouteContext<"/api/organizations/[id]/subscription/quote">) {
  const { id } = await context.params;
  const planCode = request.nextUrl.searchParams.get("planCode") ?? "";
  if (!/^[a-f\d]{24}$/i.test(id) || !(planCodes as readonly string[]).includes(planCode))
    return NextResponse.json({ success: false, error: { message: "Đường dẫn không hợp lệ." } }, { status: 400 });
  const session = await getApiSession();
  if (session.error) return session.error;
  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/${id}/subscription/quote?${new URLSearchParams({ planCode })}`,
      { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(15_000) },
    );
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ LawScan." } }, { status: 503 });
  }
}
