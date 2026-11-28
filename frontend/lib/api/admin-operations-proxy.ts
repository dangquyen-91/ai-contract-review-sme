import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { backendApiUrl } from "@/lib/api/backend";

const failure = (message: string, status: number) => NextResponse.json({ success: false, error: { message } }, { status });

/**
 * Forwards an Administrator's request to the backend's platform operations
 * (`/admin/ai-jobs`, `/admin/audit-log`). Only the listed query filters are passed on.
 */
export async function proxyAdminOperation(request: Request, path: string, forwarded: readonly string[] = []) {
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "administrator") return failure("Chỉ Quản trị viên được dùng chức năng này.", 403);
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const name of forwarded) {
    const value = params.get(name);
    if (value !== null) query.set(name, value);
  }
  try {
    const upstream = await fetch(backendApiUrl(`${path}${query.size ? `?${query}` : ""}`), {
      method: request.method,
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return failure(
      request.method === "GET" ? "Không thể tải dữ liệu. Vui lòng thử lại." : "Chưa xác nhận được kết quả. Hãy tải lại danh sách trước khi thử lại.",
      503,
    );
  }
}

export const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);
export const invalidId = () => failure("Mã tác vụ không hợp lệ.", 400);
