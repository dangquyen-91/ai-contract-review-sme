import { mutateLegalSource, proxyLegalSource } from "@/lib/api/legal-source-proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxyLegalSource(request, "detail", (await context.params).id);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return mutateLegalSource(request, (await context.params).id);
}
