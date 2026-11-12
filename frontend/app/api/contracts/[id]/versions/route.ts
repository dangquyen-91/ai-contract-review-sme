import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/versions">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/versions");
}

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/versions">) {
  const { id } = await context.params;
  const session = await getApiSession();
  if (session.error) return session.error;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contracts/${id}/versions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}`, Prefer: "respond-async" },
        body: await request.formData(),
        cache: "no-store",
      },
    );
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Không thể tải phiên bản mới lên. Vui lòng thử lại." } },
      { status: 503 },
    );
  }
}
