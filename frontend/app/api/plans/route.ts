import { NextResponse } from "next/server";

export async function GET() {
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/plans`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa thể tải gói dịch vụ. Vui lòng thử lại." } }, { status: 503 });
  }
}
