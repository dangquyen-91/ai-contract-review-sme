import type { NextRequest } from "next/server";
import { proxyExpertWorkspace } from "@/lib/api/expert-workspace-proxy";

export async function GET(request: NextRequest) {
  return proxyExpertWorkspace(request);
}
