import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await context.params;
  return proxyContractDraft(request, ["legal-sources", sourceId]);
}
