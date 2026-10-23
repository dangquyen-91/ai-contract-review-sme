import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";

type LegalSourceAction = "create" | "delete" | "detail" | "preview" | "parts" | "resume";

export async function proxyLegalSource(request: Request, action: LegalSourceAction, id?: string) {
  try {
    const session = await getApiSession();
    if (session.error) return session.error;
    if (session.user.role !== "manager")
      return NextResponse.json(
        { success: false, error: { message: "Bạn không có quyền quản lý kho pháp lý." } },
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
    const needsId = ["delete", "detail", "parts", "resume"].includes(action);
    if (needsId && !id) return NextResponse.json({ success: false, error: { message: "Thiếu mã nguồn pháp lý." } }, { status: 400 });
    const body = ["create", "preview", "parts"].includes(action) ? await request.formData() : undefined;
    const suffix = action === "preview" ? "/preview" : id ? `/${id}${action === "parts" || action === "resume" ? `/${action}` : ""}` : "";
    const upstream = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/kb/legal-sources${suffix}`,
      {
        method: action === "detail" ? "GET" : action === "delete" ? "DELETE" : "POST",
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

export function mutateLegalSource(request: Request, id?: string) {
  return proxyLegalSource(request, id ? "delete" : "create", id);
}
