import { NextRequest } from "next/server";
import { proxyOrganizationMutation } from "@/lib/api/organization-proxy";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/organizations/[id]">,
) {
  return proxyOrganizationMutation(request, (await context.params).id);
}
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/organizations/[id]">,
) {
  // Membership changes, but the account and refresh session remain valid.
  return proxyOrganizationMutation(request, (await context.params).id);
}
