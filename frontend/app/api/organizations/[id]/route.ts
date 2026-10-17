import { NextRequest } from "next/server";
import { proxyOrganizationMutation } from "@/lib/api/organization-proxy";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/organizations/[id]">) {
  return proxyOrganizationMutation(request, (await context.params).id);
}
export async function DELETE(request: NextRequest, context: RouteContext<"/api/organizations/[id]">) {
  const response = await proxyOrganizationMutation(request, (await context.params).id);
  if (response.ok) {
    for (const name of ["lawscan_access", "lawscan_refresh", "lawscan_user", "lawscan_remember"]) {
      response.headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    }
  }
  return response;
}
