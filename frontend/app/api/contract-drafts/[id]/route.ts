import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export const maxDuration = 120;

export async function GET(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]">) {
  return proxyContractDraft(request, [(await context.params).id]);
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]">) {
  return proxyContractDraft(request, [(await context.params).id]);
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/contract-drafts/[id]">) {
  return proxyContractDraft(request, [(await context.params).id]);
}
