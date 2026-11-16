import { proxyLegalSource } from "@/lib/api/legal-source-proxy";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxyLegalSource(request, "resume", (await context.params).id);
}
