import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export async function mutateLegalSource(request: Request, id?: string) {
  try {
    const session = await getAdminSession();
    if (!session)
      return NextResponse.json(
        { success: false, error: { message: "Vui lòng đăng nhập lại." } },
        { status: 401 },
      );
    if (session.role !== "administrator")
      return NextResponse.json(
        { success: false, error: { message: "Bạn không có quyền quản trị." } },
        { status: 403 },
      );
    if (id !== undefined && !/^[a-f\d]{24}$/i.test(id))
      return NextResponse.json(
        {
          success: false,
          error: { message: "Mã nguồn pháp lý không hợp lệ." },
        },
        { status: 400 },
      );
    const body = id === undefined ? await request.formData() : undefined;
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/kb/legal-sources${id ? `/${id}` : ""}`,
      {
        method: id ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(180000),
      },
    );
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await upstream.json(), {
      status: upstream.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            "Chưa xác nhận được kết quả thao tác. Hãy làm mới danh sách trước khi thử lại.",
        },
      },
      { status: 503 },
    );
  }
}
