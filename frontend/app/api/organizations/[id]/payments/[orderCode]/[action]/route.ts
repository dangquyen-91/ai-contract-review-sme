import { NextRequest, NextResponse } from "next/server";
import { proxyPayment } from "@/lib/api/payment-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/organizations/[id]/payments/[orderCode]/[action]">) {
  const { id, orderCode, action } = await context.params;
  if (action !== "sync" && action !== "cancel") return NextResponse.json({ success: false }, { status: 404 });
  return proxyPayment(request, id, orderCode, action);
}
