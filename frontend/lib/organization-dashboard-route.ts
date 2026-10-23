import { routes } from "@/config/routes";

export type OrganizationDashboardRole = "owner" | "manager" | "staff" | "expert";

export function isOrganizationDashboardRole(role: string): role is OrganizationDashboardRole {
  return role === "owner" || role === "manager" || role === "staff" || role === "expert";
}
export type OrganizationDashboardView = "overview" | "upload" | "contracts" | "administration" | "members";

export function organizationDashboardPath(_role: OrganizationDashboardRole, view: OrganizationDashboardView = "overview") {
  if (view === "overview") return routes.dashboard;
  if (view === "upload") return routes.reviewWorkspace;
  if (view === "contracts") return routes.contracts;
  return view === "administration" ? routes.settings : routes.members;
}

export function organizationDashboardView(pathname: string): OrganizationDashboardView {
  if (pathname.startsWith(routes.contracts + "/") && pathname.includes("/reviews/")) return "contracts";
  if (pathname === routes.reviewWorkspace || pathname.startsWith(routes.contracts + "/")) return "upload";
  if (pathname === routes.contracts) return "contracts";
  if (pathname === routes.settings) return "administration";
  if (pathname === routes.members) return "members";
  return "overview";
}
