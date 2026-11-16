import type { NextRequest } from "next/server";
import { proxyExpertVerification } from "@/lib/api/expert-verification-proxy";

export async function GET(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params;
  return proxyExpertVerification(request, reviewId, "get");
}
