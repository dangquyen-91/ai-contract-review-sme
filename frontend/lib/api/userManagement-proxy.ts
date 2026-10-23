import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";

export async function proxyUserManagement(request: Request, id?: string) {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    if (session.user.role !== "administrator") return NextResponse.json({ success: false, error: { message: "Bạn không có quyền quản lý người dùng." } }, { status: 403 });
    if (id !== undefined && !/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ success: false, error: { message: "Mã người dùng không hợp lệ." } }, { status: 400 });
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ success: false, error: { message: "Nguồn yêu cầu không hợp lệ." } }, { status: 403 });
    }
    let body: string | undefined;
    if (["POST", "PATCH"].includes(request.method)) {
      try { body = JSON.stringify(await request.json()); }
      catch { return NextResponse.json({ success: false, error: { message: "Dữ liệu JSON không hợp lệ." } }, { status: 400 }); }
    }
    const query = request.method === "GET" && !id ? new URL(request.url).search : "";
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/admin/users${id ? `/${id}` : ""}${query}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Chưa xác nhận được kết quả. Hãy tải lại danh sách trước khi thử lại." } }, { status: 503 });
  }
}
