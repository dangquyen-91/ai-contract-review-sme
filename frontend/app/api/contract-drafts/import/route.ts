import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return proxyContractDraft(request, ["import"]);
}
