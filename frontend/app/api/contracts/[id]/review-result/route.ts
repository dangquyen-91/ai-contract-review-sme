import { getApiSession } from "@/lib/auth/api-session";
import { NextRequest, NextResponse } from "next/server";
import type { ContractClause, UpstreamPayload } from "@/types/contracts";
import { clauseLabel } from "@/lib/review/clause-label";
import { backendApiUrl } from "@/lib/api/backend";

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
  const base = backendApiUrl(`/contracts/${id}`);
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
    // Keep document text private; expose only positions and a safe article label.
    const clauses = (payloads[1].data as ContractClause[]).map((clause) => ({
      id: clause.id, _id: clause._id, index: clause.index,
      label: clauseLabel(clause), startOffset: clause.startOffset, endOffset: clause.endOffset,
    }));
    return NextResponse.json({ success: true, data: {
      contract, clauses, findings: payloads[2].data,
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Không thể tải kết quả rà soát. Vui lòng thử lại." } }, { status: 503 });
  }
}
