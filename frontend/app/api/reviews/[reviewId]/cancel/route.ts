import { NextRequest } from "next/server";
import { proxyReviewAction } from "@/lib/api/review-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/reviews/[reviewId]/cancel">) {
  return proxyReviewAction(request, (await context.params).reviewId, "cancel");
}
