import { NextRequest, NextResponse } from "next/server";

const resources = new Set(["members", "invitations", "subscription"]);

type ResourceContext = { params: Promise<{ id: string; resource: string }> };

async function forward(request: NextRequest, context: ResourceContext, method: "GET" | "POST") {
  const { id, resource } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id) || !resources.has(resource) || (method === "POST" && resource !== "invitations")) {
    return NextResponse.json({ success: false, error: { message: "Đường dẫn không hợp lệ." } }, { status: 404 });
  }
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return NextResponse.json({ success: false, error: { message: "Vui lòng đăng nhập." } }, { status: 401 });
  try {
    const query = method === "GET" && resource !== "subscription" ? `?${new URLSearchParams({ page: request.nextUrl.searchParams.get("page") ?? "1", limit: "20" })}` : "";
    const upstream = await fetch(`${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/organizations/${id}/${resource}${query}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify(await request.json()) : undefined,
      cache: "no-store",
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể kết nối máy chủ LawScan." } }, { status: 503 });
  }
}

export async function GET(request: NextRequest, context: ResourceContext) {
  return forward(request, context, "GET");
}
export async function POST(request: NextRequest, context: ResourceContext) {
  return forward(request, context, "POST");
}
