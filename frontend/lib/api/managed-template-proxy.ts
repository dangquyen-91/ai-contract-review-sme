import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "@/lib/api/request-origin";
import { backendApiUrl } from "@/lib/api/backend";

export async function proxyManagedTemplate(
  request: NextRequest,
  path: string[],
) {
  if (request.method !== "GET" && !isSameOriginRequest(request))
    return NextResponse.json({ success: false }, { status: 403 });
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "manager")
    return NextResponse.json({ success: false }, { status: 403 });
  const methods =
    path.length === 0
      ? ["GET", "POST"]
      : /^[a-f\d]{24}$/i.test(path[0])
        ? path.length === 1
          ? ["GET", "PATCH", "DELETE"]
          : path.length === 2 && ["publish", "retire"].includes(path[1])
            ? ["POST"]
            : []
        : [];
  if (!methods.includes(request.method))
    return NextResponse.json({ success: false }, { status: 404 });
  try {
    const query = new URLSearchParams();
    for (const key of ["page", "q"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value !== null) query.set(key, value);
    }
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && new TextEncoder().encode(body).length > 500000)
      return NextResponse.json({ success: false }, { status: 413 });
    const upstream = await fetch(
      backendApiUrl(`/manager/contract-templates${path.length ? "/" + path.join("/") : ""}?${query}`),
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    return NextResponse.json(await upstream.json(), {
      status: upstream.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Chưa xác nhận được kết quả. Hãy tải lại trước khi thử lại.",
        },
      },
      { status: 503 },
    );
  }
}
