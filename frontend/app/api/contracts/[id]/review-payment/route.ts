import { NextRequest } from "next/server";
import { proxyContractRequest } from "@/lib/api/contract-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return proxyContractRequest(
    request,
    (await context.params).id,
    "/review-payment",
  );
}
