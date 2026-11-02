import { NextRequest } from "next/server";
import { proxyContractDraft } from "@/lib/api/contract-draft-proxy";

export async function GET(request: NextRequest) {
  return proxyContractDraft(request, ["legal-sources"]);
}
