import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/contracts/[id]/risks/[findingId]">) {
  const { id, findingId } = await context.params;
  return proxyContractRequest(request, id, `/risks/${findingId}`, { method: "PATCH", findingId });
}
