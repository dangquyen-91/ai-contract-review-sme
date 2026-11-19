import type { DashboardRole } from "@/config/dashboard-roles";
export const dashboardRoles: DashboardRole[] = ["administrator", "owner", "manager", "staff", "expert", "user"];
export const permissions = {
  // Personal accounts have too little data for a report page; their overview shows it.
  reports: (role: string) => role !== "user" && dashboardRoles.includes(role as DashboardRole),
  operationalReports: (role: string) => ["administrator", "owner"].includes(role),
  reportExport: (role: string) => ["administrator", "owner", "manager", "expert", "user"].includes(role),
  expertVerification: (role: string) => role === "expert",
  contracts: (role: string) => ["owner", "staff", "expert", "user"].includes(role),
  members: (role: string) => role === "owner",
  settings: (role: string) => role === "owner",
  subscription: (role: string) => role === "user",
  management: (role: string) => role === "manager",
  managementArea: (role: string) => role === "manager" || role === "administrator",
  admin: (role: string) => role === "administrator",
};
