import type { NextRequest } from "next/server";
import { proxyPayment } from "@/lib/api/payment-proxy";

export async function GET(request: NextRequest, context: RouteContext<"/api/organizations/[id]/payments">) {
  return proxyPayment(request, (await context.params).id);
}
export async function POST(request: NextRequest, context: RouteContext<"/api/organizations/[id]/payments">) {
  return proxyPayment(request, (await context.params).id);
}
