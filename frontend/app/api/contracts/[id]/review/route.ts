import { NextRequest, NextResponse } from "next/server";
import type { UpstreamPayload } from "@/types/contracts";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

async function readPayload(response: Response): Promise<UpstreamPayload> {
  return response.json().catch(() => ({ success: false, error: { message: "Máy chủ trả về dữ liệu không hợp lệ." } }));
}

function access(request: NextRequest, id: string) {
  const token = request.cookies.get("lawscan_access")?.value;
  if (!token) return { response: NextResponse.json({ success: false, error: { message: "Phiên đăng nhập đã hết hạn." } }, { status: 401 }) };
  if (!/^[a-f\d]{24}$/i.test(id)) return { response: NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 }) };
  return { token };
}

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/review">) {
  const { id } = await context.params;
  const auth = access(request, id);
  if (auth.response) return auth.response;
  const headers = { Authorization: `Bearer ${auth.token}` };
  const base = `${apiBaseUrl}/api/v1/contracts/${id}`;
  try {
    const responses = await Promise.all(["", "/clauses", "/risks", "/text"].map((path) =>
      fetch(`${base}${path}`, { headers, cache: "no-store" }),
    ));
    const payloads = await Promise.all(responses.map(readPayload));
    const failed = responses.findIndex((response) => !response.ok);
    if (failed !== -1) return NextResponse.json(payloads[failed], { status: responses[failed].status });
    const extractedText = (payloads[3].data as { text?: unknown } | undefined)?.text;
    return NextResponse.json({ success: true, data: {
      contract: payloads[0].data, clauses: payloads[1].data,
      findings: payloads[2].data, extractedText: typeof extractedText === "string" ? extractedText : "",
    } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải kết quả rà soát. Vui lòng thử lại." } }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/review">) {
  const { id } = await context.params;
  const auth = access(request, id);
  if (auth.response) return auth.response;
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ success: false, error: { message: "Idempotency-Key không hợp lệ." } }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${apiBaseUrl}/api/v1/contracts/${id}/reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: await request.text(), cache: "no-store",
    });
    return NextResponse.json(await readPayload(upstream), { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể bắt đầu rà soát. Vui lòng thử lại." } }, { status: 503 });
  }
}
