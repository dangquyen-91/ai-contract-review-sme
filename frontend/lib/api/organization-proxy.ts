import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/api/backend";

export async function proxyOrganizationMutation(request: NextRequest, id: string, suffix = "") {
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: { message: "Mã tổ chức không hợp lệ." } }, { status: 400 });
  try {
    const upstream = await fetch(backendApiUrl(`/organizations/${id}${suffix}`), {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(request.method !== "DELETE" ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ. Vui lòng thử lại." } }, { status: 503 });
  }
}
