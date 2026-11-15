import type { DashboardRole } from "@/config/dashboard-roles";
export const routes = {
  dashboard: "/dashboard", contracts: "/contract", reviewWorkspace: "/review",
  members: "/members", settings: "/settings", subscription: "/subscription",
  management: "/management", organizations: "/management/organizations", legalSources: "/management/legal-sources",
  admin: "/admin", users: "/admin/users",
  contract: (id: string) => "/contract/" + encodeURIComponent(id),
  review: (contractId: string, reviewId: string) => "/contract/" + encodeURIComponent(contractId) + "/reviews/" + encodeURIComponent(reviewId),
  expertVerification: "/expert-verification",
  expertOverview: "/expert-verification/overview",
  expertMyWork: "/expert-verification/my-work",
  home: (role: DashboardRole) => role === "administrator" ? "/admin" : role === "manager" ? "/management" : role === "expert" ? "/expert-verification/overview" : "/dashboard",
};
