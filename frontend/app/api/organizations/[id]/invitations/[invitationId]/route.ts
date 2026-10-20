import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; invitationId: string }> }) {
  const { id, invitationId } = await context.params;
  if (![id, invitationId].every((value) => /^[a-f\d]{24}$/i.test(value))) {
    return NextResponse.json({ success: false, error: { message: "Đường dẫn không hợp lệ." } }, { status: 404 });
  }
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Vui lòng đăng nhập." } }, { status: 401 });
  try {
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/${id}/invitations/${invitationId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ LawScan." } }, { status: 503 });
  }
}
