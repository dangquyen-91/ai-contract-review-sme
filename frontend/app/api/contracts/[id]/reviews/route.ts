import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/reviews">) {
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  const { id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/reviews`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải lịch sử rà soát." } }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/reviews">) {
  const { id } = await context.params;
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 });
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ success: false, error: { message: "Idempotency-Key không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: await request.text(), cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể bắt đầu rà soát. Vui lòng thử lại." } }, { status: 503 });
  }
}
