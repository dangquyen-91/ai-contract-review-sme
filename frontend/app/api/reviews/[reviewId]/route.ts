import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/reviews/[reviewId]">) {
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  const { reviewId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(reviewId)) {
    return NextResponse.json({ success: false, error: { message: "Mã lượt rà soát không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/${reviewId}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải trạng thái rà soát." } }, { status: 503 });
  }
}
