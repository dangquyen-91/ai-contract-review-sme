import type { NextRequest } from "next/server";
import { proxyExpertWorkspace } from "@/lib/api/expert-workspace-proxy";

type Context = { params: Promise<{ reviewId: string; expertAction: string[] }> };
async function handle(request: NextRequest, context: Context) {
  const { reviewId, expertAction } = await context.params;
  return proxyExpertWorkspace(request, reviewId, expertAction);
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
