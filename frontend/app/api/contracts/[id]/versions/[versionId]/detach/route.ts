import { NextRequest, NextResponse } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/versions/[versionId]/detach">) {
  const { id, versionId } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(versionId)) {
    return NextResponse.json({ success: false, error: { message: "Mã phiên bản không hợp lệ." } }, { status: 400 });
  }
  return proxyContractRequest(request, id, `/versions/${versionId}/detach`, { method: "POST" });
}
