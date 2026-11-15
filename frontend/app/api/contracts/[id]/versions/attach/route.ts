import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/versions/attach">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/versions/attach", { method: "POST" });
}
