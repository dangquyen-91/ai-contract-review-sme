import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function DELETE(request: NextRequest, context: RouteContext<"/api/contracts/[id]">) {
  return proxyContractRequest(request, (await context.params).id, "", { method: "DELETE" });
}

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "");
}
