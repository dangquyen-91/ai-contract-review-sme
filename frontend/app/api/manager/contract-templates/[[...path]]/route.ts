import { NextRequest } from "next/server";
import { proxyManagedTemplate } from "@/lib/api/managed-template-proxy";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: NextRequest, context: Context) {
  return proxyManagedTemplate(request, (await context.params).path ?? []);
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
