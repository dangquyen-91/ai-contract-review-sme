import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { backendApiUrl } from "@/lib/api/backend";

export async function GET() {
  const session = await getApiSession();
  if (session.error) return session.error;
  try {
    const upstream = await fetch(backendApiUrl(`/auth/workspaces`), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ LawScan." } }, { status: 503 });
  }
}
