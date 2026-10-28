import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export const maxDuration = 120;

export async function POST(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]/proposals/[proposalId]">) {
  const { id, proposalId } = await context.params;
  return proxyContractDraft(request, [id, "proposals", proposalId]);
}
