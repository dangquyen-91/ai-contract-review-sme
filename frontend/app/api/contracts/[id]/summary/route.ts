import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/summary">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/summary", { method: "POST" });
}
