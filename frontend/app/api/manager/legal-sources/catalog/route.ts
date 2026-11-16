import { proxyLegalSource } from "@/lib/api/legal-source-proxy";

export async function GET(request: Request) {
  return proxyLegalSource(request, "catalog");
}
