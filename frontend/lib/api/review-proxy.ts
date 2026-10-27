import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";

const objectIdPattern = /^[a-f\d]{24}$/i;
const idempotencyKeyPattern = /^[a-zA-Z0-9_-]{8,128}$/;

export async function proxyReviewAction(request: NextRequest, reviewId: string, action: "cancel" | "retry") {
  const session = await getApiSession();
  if (session.error) return session.error;
  const accessToken = session.accessToken;
  if (!objectIdPattern.test(reviewId)) {
    return NextResponse.json({ success: false, error: { message: "Mã lượt rà soát không hợp lệ." } }, { status: 400 });
  }
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (action === "retry" && (!idempotencyKey || !idempotencyKeyPattern.test(idempotencyKey))) {
    return NextResponse.json({ success: false, error: { message: "Idempotency-Key không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/reviews/${reviewId}/${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(action === "retry" && idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: action === 'retry' ? (await request.text()) || '{}' : '{}',
        cache: "no-store",
      },
    );
    const payload = await upstream.json().catch(() => ({
      success: false,
      error: { message: "Máy chủ trả về dữ liệu không hợp lệ." },
    }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: action === "cancel" ? "Không thể dừng rà soát. Vui lòng thử lại." : "Không thể rà soát lại. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
