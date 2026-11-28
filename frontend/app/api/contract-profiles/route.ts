import { getApiSession } from "@/lib/auth/api-session";
import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/api/backend";

export async function GET() {
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  try {
    const upstream = await fetch(backendApiUrl(`/contract-profiles`), {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải danh mục hợp đồng." } }, { status: 503 });
  }
}
