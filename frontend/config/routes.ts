import type { DashboardRole } from "@/config/dashboard-roles";
export const routes = {
  dashboard: "/dashboard", contracts: "/contract", reviewWorkspace: "/review",
  members: "/dashboard/members", settings: "/dashboard/settings", subscription: "/dashboard/subscription",
  management: "/management", organizations: "/management/organizations", legalSources: "/management/legal-sources",
  admin: "/admin", users: "/admin/users",
  contract: (id: string) => "/contract/" + encodeURIComponent(id),
  review: (contractId: string, reviewId: string) => "/contract/" + encodeURIComponent(contractId) + "/reviews/" + encodeURIComponent(reviewId),
  home: (role: DashboardRole) => role === "administrator" ? "/admin" : role === "manager" ? "/management" : "/dashboard",
};
