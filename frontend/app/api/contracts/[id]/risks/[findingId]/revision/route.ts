import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function DELETE(request: NextRequest, context: RouteContext<"/api/contracts/[id]/risks/[findingId]/revision">) {
  const { id, findingId } = await context.params;
  return proxyContractRequest(request, id, `/risks/${findingId}/revision`, { method: "DELETE", findingId });
}
