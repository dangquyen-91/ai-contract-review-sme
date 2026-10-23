import { getApiSession } from "@/lib/auth/api-session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contract-profiles`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải danh mục hợp đồng." } }, { status: 503 });
  }
}
