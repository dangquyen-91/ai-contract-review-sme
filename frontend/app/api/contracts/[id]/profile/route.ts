import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/contracts/[id]/profile">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/profile", { method: "PATCH" });
}
