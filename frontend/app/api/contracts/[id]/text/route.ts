import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function GET(request: NextRequest, context: RouteContext<"/api/contracts/[id]/text">) {
  const { id } = await context.params;
  const redacted = request.nextUrl.searchParams.get("redacted") === "true";
  const partial = request.nextUrl.searchParams.get("redactionMode") === "partial";
  return proxyContractRequest(request, id, redacted ? `/text?redacted=true${partial ? "&redactionMode=partial" : ""}` : "/text");
}
