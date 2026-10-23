import { proxyLegalSource } from "@/lib/api/legal-source-proxy";
export async function POST(request: Request) {
  return proxyLegalSource(request, "preview");
}
