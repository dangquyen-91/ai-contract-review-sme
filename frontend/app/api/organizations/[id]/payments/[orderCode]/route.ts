import type { NextRequest } from "next/server";
import { proxyPayment } from "@/lib/api/payment-proxy";

export async function GET(request: NextRequest, context: RouteContext<"/api/organizations/[id]/payments/[orderCode]">) {
  const { id, orderCode } = await context.params;
  return proxyPayment(request, id, orderCode);
}
