import { NextRequest } from "next/server";
import { proxyContractStream } from "@/lib/api/contract-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/contracts/[id]/chat/stream">) {
  const { id } = await context.params;
  return proxyContractStream(request, id, "/chat/stream");
}
