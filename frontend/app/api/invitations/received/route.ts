import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/request-origin";
import { getApiSession } from "@/lib/auth/api-session";

async function proxy(request: NextRequest, decline = false) {
  if (decline && !isSameOriginRequest(request)) return NextResponse.json({ success: false }, { status: 403 });
  const session = await getApiSession();
  if (session.error) return session.error;
  const token = session.accessToken;
  try {
    let suffix = "";
    if (decline) {
      const { invitationId } = await request.json();
      if (typeof invitationId !== "string" || !/^[a-f\d]{24}$/i.test(invitationId)) return NextResponse.json({ success: false }, { status: 400 });
      suffix = `/${invitationId}/decline`;
    }
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/invitations/received${suffix}`, {
      method: decline ? "POST" : "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải lời mời. Vui lòng thử lại." } }, { status: 503 });
  }
}
export async function GET(request: NextRequest) { return proxy(request); }
export async function POST(request: NextRequest) { return proxy(request, true); }
