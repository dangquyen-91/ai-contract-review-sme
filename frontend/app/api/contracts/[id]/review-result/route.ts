import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";
import type { ContractClause, UpstreamPayload } from "@/types/contracts";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

async function readPayload(response: Response): Promise<UpstreamPayload> {
  return response.json().catch(() => ({ success: false, error: { message: "Máy chủ trả về dữ liệu không hợp lệ." } }));
}

async function access(id: string) {
  const session = await getApiSession();
  if (session.error) return { response: session.error };
  const token = session.accessToken;
  if (!/^[a-f\d]{24}$/i.test(id)) return { response: NextResponse.json({ success: false, error: { message: "Mã hợp đồng không hợp lệ." } }, { status: 400 }) };
  return { token };
}

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/review-result">) {
  const { id } = await context.params;
  const auth = await access(id);
  if (auth.response) return auth.response;
  const headers = { Authorization: `Bearer ${auth.token}` };
  const base = `${apiBaseUrl}/api/v1/contracts/${id}`;
  try {
    const responses = await Promise.all(["", "/clauses", "/risks"].map((path) =>
      fetch(`${base}${path}`, { headers, cache: "no-store" }),
    ));
    const payloads = await Promise.all(responses.map(readPayload));
    const failed = responses.findIndex((response) => !response.ok);
    if (failed !== -1) return NextResponse.json(payloads[failed], { status: responses[failed].status });
    const contract = { ...(payloads[0].data as Record<string, unknown>) };
    delete contract.extractedText;
    if (contract.currentVersion) {
      const version = { ...(contract.currentVersion as Record<string, unknown>) };
      delete version.extractedText;
      contract.currentVersion = version;
    }
    // Only positions cross the browser boundary here. Document text is loaded on demand.
    const clauses = (payloads[1].data as ContractClause[]).map(({ id, _id, index, startOffset, endOffset }) => ({ id, _id, index, startOffset, endOffset }));
    return NextResponse.json({ success: true, data: {
      contract, clauses, findings: payloads[2].data,
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải kết quả rà soát. Vui lòng thử lại." } }, { status: 503 });
  }
}
