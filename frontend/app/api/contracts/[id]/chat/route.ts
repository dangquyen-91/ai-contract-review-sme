import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/chat">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/chat");
}

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/chat">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/chat", { method: "POST" });
}
