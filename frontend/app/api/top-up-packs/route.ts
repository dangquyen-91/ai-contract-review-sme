import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/api/backend";

// Public catalog of top-up packs, proxied like /api/plans.
export async function GET() {
  try {
    const upstream = await fetch(backendApiUrl(`/top-up-packs`), {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa thể tải các gói mua thêm. Vui lòng thử lại." } }, { status: 503 });
  }
}
