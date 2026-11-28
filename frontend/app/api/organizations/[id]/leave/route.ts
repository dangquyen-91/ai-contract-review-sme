import { NextRequest, NextResponse } from "next/server";
import { proxyOrganizationMutation } from "@/lib/api/organization-proxy";
import { isSameOriginRequest } from "@/lib/api/request-origin";

export async function POST(request: NextRequest, context: RouteContext<"/api/organizations/[id]/leave">) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: { message: "Yêu cầu không hợp lệ." } }, { status: 403 });
  }
  return proxyOrganizationMutation(request, (await context.params).id, "/leave");
}
