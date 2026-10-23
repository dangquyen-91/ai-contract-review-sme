import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/classify">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/classify", { method: "POST" });
}
