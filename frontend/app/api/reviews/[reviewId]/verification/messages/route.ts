import type { NextRequest } from "next/server";
import { proxyExpertConsultation } from "@/lib/api/expert-consultation-proxy";

type Context = { params: Promise<{ reviewId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { reviewId } = await context.params;
  return proxyExpertConsultation(request, reviewId, "GET");
}

export async function POST(request: NextRequest, context: Context) {
  const { reviewId } = await context.params;
  return proxyExpertConsultation(request, reviewId, "POST");
}
