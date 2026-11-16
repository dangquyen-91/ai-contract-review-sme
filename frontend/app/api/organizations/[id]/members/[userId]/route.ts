import { NextRequest, NextResponse } from "next/server";
import { proxyOrganizationMutation } from "@/lib/api/organization-proxy";
import { isSameOriginRequest } from "@/lib/api/request-origin";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; userId: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: { message: "Yêu cầu không hợp lệ." } }, { status: 403 });
  }
  const { id, userId } = await context.params;
  if (![id, userId].every(value => /^[a-f\d]{24}$/i.test(value))) {
    return NextResponse.json({ success: false, error: { message: "Đường dẫn không hợp lệ." } }, { status: 404 });
  }
  return proxyOrganizationMutation(request, id, `/members/${userId}`);
}
