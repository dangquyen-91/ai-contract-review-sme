import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";

export async function GET() {
  const session = await getApiSession();
  if (session.error) return session.error;
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/address-options`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Chưa tải được danh sách địa chỉ. Vui lòng thử lại.",
        },
      },
      { status: 503 },
    );
  }
}
