import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/risks/detect">) {
  const { id } = await context.params;
  return proxyContractRequest(request, id, "/risks/detect", { method: "POST" });
}
