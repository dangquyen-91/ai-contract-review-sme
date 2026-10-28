import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export const maxDuration = 120;

export async function PATCH(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]/pin">) {
  return proxyContractDraft(request, [(await context.params).id, "pin"]);
}
