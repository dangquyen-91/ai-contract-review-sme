import type { NextRequest } from "next/server";
import { proxyMyExpertWork } from "@/lib/api/expert-work-proxy";

export async function GET(request: NextRequest) {
  return proxyMyExpertWork(request);
}
