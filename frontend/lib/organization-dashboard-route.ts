export type OrganizationDashboardRole = "owner" | "manager" | "staff" | "reviewer";

export function isOrganizationDashboardRole(role: string): role is OrganizationDashboardRole {
  return role === "owner" || role === "manager" || role === "staff" || role === "reviewer";
}
export type OrganizationDashboardView = "overview" | "upload" | "contracts" | "administration" | "members";

export function organizationDashboardPath(role: OrganizationDashboardRole, view: OrganizationDashboardView = "overview") {
  const base = `/dashboard/${role}`;
  if (view === "overview") return base;
  if (view === "upload") return `${base}/review`;
  if (view === "contracts") return `${base}/contract`;
  return `${base}/${view}`;
}

export function organizationDashboardView(pathname: string): OrganizationDashboardView {
  const section = pathname.split("/")[3];
  if (section === "review") return "upload";
  if (section === "contract") return "contracts";
  if (section === "administration" || section === "members") return section;
  return "overview";
}
