import { NextRequest } from "next/server";
import { proxyOrganizationMutation } from "@/lib/api/organization-proxy";

export async function POST(request: NextRequest, context: RouteContext<"/api/organizations/[id]/subscription/downgrade">) {
  return proxyOrganizationMutation(request, (await context.params).id, "/subscription/downgrade");
}
export async function DELETE(request: NextRequest, context: RouteContext<"/api/organizations/[id]/subscription/downgrade">) {
  return proxyOrganizationMutation(request, (await context.params).id, "/subscription/downgrade");
}
