import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export const maxDuration = 120;

export async function POST(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]/copy-latest">) {
  return proxyContractDraft(request, [(await context.params).id, "copy-latest"]);
}
