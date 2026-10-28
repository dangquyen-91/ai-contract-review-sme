import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api-session";
import { isSameOriginRequest } from "@/lib/request-origin";

const draftIdPattern = /^[a-f\d]{24}$/i;
const postActions = new Set([
  "generate",
  "decision",
  "publish",
  "copy-latest",
  "studio",
  "reference",
]);

function allowedDraftMethods(path: string[]): readonly string[] {
  if (path.length === 0) return ["GET", "POST"];
  if (path.length === 1 && path[0] === "templates") return ["GET"];
  if (!draftIdPattern.test(path[0])) return [];
  if (path.length === 1) return ["GET", "PATCH", "DELETE"];
  if (path.length === 2) {
    if (path[1] === "pin") return ["PATCH"];
    if (path[1] === "assistant") return ["GET", "POST"];
    if (path[1] === "export") return ["GET"];
    if (postActions.has(path[1])) return ["POST"];
  }
  if (
    path.length === 3 &&
    path[1] === "proposals" &&
    draftIdPattern.test(path[2])
  )
    return ["POST"];
  return [];
}

export async function proxyContractDraft(request: NextRequest, path: string[]) {
  if (request.method !== "GET" && !isSameOriginRequest(request))
    return NextResponse.json({ success: false }, { status: 403 });
  const session = await getApiSession();
  if (session.error) return session.error;
  if (session.user.role !== "user" && (!session.user.orgId || !["owner", "staff"].includes(session.user.role)))
    return NextResponse.json(
      {
        success: false,
        error: { message: "Bạn không có quyền soạn hợp đồng." },
      },
      { status: 403 },
    );
  if (!allowedDraftMethods(path).includes(request.method))
    return NextResponse.json({ success: false }, { status: 404 });
  const query = new URLSearchParams();
  if (!path.length)
    query.set("page", request.nextUrl.searchParams.get("page") ?? "1");
  if (path[1] === "export")
    query.set("format", request.nextUrl.searchParams.get("format") ?? "docx");
  try {
    const reference = path[1] === "reference";
    const body =
      request.method !== "GET"
        ? reference
          ? await request.arrayBuffer()
          : await request.text()
        : undefined;
    if (body instanceof ArrayBuffer && body.byteLength > 3 * 1024 * 1024)
      return NextResponse.json({ success: false }, { status: 413 });
    const response = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/contract-drafts${path.length ? "/" + path.join("/") : ""}?${query}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": reference
            ? (request.headers.get("content-type") ?? "")
            : "application/json",
        },
        ...(request.method !== "GET" ? { body } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(
          ["generate", "assistant"].includes(path[1])
            ? 100_000
            : path[1] === "publish"
              ? 90_000
              : 30_000,
        ),
      },
    );
    if (response.ok && path[1] === "export" && query.get("format") === "docx")
      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="hop-dong-${path[0]}.docx"`,
          "Cache-Control": "no-store",
        },
      });
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            "Chưa thể hoàn tất yêu cầu. Vui lòng tải lại bản nháp trước khi thử lại.",
        },
      },
      { status: 503 },
    );
  }
}
