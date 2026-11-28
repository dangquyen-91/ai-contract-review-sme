import type { Icon } from "@/components/ui/icon";
import type { DashboardRole } from "./dashboard-roles";
import { organizationDashboardPath } from "@/lib/routing/organization-dashboard-route";
import { userManagementPath } from "./user-management";
import { routes } from "./routes";
import { roleReportConfig } from "./report-profiles";
import { permissions } from "./permissions";

export type NavigationItem = {
  key: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  group?: string;
  href?: string;
  count?: boolean;
  mobile?: boolean;
  workspaceTab?: boolean;
  // Opens this dialog in place; `href` stays as the page to open without it.
  dialog?: "create-organization";
};

const adminNavigation: NavigationItem[] = [
  { key: "overview", href: "/admin", label: "Tổng quan", icon: "briefcase", group: "Không gian quản trị", mobile: true },
  { key: "userManagement", href: userManagementPath, label: "Người dùng", icon: "team", mobile: true },
  { key: "ai-jobs", href: "/admin/ai-jobs", label: "Giám sát AI", icon: "sparkle", group: "Vận hành", mobile: true },
  { key: "reports", href: "/admin/reports", label: "Báo cáo & thống kê", icon: "chart", mobile: true },
  { key: "audit-log", href: "/admin/audit-log", label: "Nhật ký quản trị", icon: "shield", mobile: true },
];

const supportNavigation: NavigationItem[] = [
  { key: "sample-report", href: "/bao-cao-mau", label: "Báo cáo mẫu", icon: "search", group: "Hỗ trợ" },
  { key: "plans", href: "/goi-dich-vu", label: "Gói dịch vụ", icon: "sparkle" },
];

export function getDashboardNavigation(role: DashboardRole): NavigationItem[] {
  const reports: NavigationItem[] = permissions.reports(role) ? [{ key: "reports", href: roleReportConfig[role].href, label: role === "staff" ? "Báo cáo công việc" : "Báo cáo & thống kê", icon: "chart", mobile: true }] : [];
  if (role === "administrator") return adminNavigation;
  if (role === "expert") return [
    { key: "expert-overview", href: routes.expertOverview, label: "Tổng quan", icon: "chart", group: "Không gian chuyên gia", mobile: true },
    { key: "verification", href: routes.expertVerification, label: "Yêu cầu xác minh", icon: "shield", mobile: true },
    { key: "expert-my-work", href: routes.expertMyWork, label: "Công việc của tôi", icon: "briefcase", mobile: true },
    ...reports,
  ];
  if (role === "manager") return [
    { key: "overview", href: "/management", label: "Tổng quan", icon: "chart", group: "Không gian quản lý", mobile: true },
    { key: "organizations", href: "/management/organizations", label: "Tổ chức", icon: "building", mobile: true },
    { key: "payments", href: "/management/payments", label: "Lịch sử giao dịch", icon: "document", mobile: true },
    { key: "legal-sources", href: "/management/legal-sources", label: "Kho pháp lý", icon: "scales", mobile: true },
    { key: "contract-templates", href: "/management/contract-templates", label: "Mẫu hợp đồng", icon: "document", mobile: true },
    ...reports,
    ...supportNavigation,
  ];
  if (role === "user") return [
    { key: "overview", href: "/dashboard", label: "Tổng quan", icon: "chart", group: "Không gian làm việc", mobile: true },
    { key: "review", href: "/review", label: "Tải & rà soát", icon: "upload", mobile: true },
    { key: "contract", href: "/contract", label: "Hợp đồng", icon: "document", count: true, mobile: true },
    { key: "drafts", href: "/contract-drafts", label: "Tạo hợp đồng", icon: "document", mobile: true },
    ...reports,
    { key: "create-organization", href: "/chon-to-chuc", dialog: "create-organization", label: "Tạo tổ chức", icon: "building", group: "Hỗ trợ", mobile: true },
    ...supportNavigation.map((item) => ({ ...item, ...(item.key === "plans" ? { key: "subscription", href: routes.subscription } : {}), group: undefined })),
  ];

  return [
    { key: "overview", href: organizationDashboardPath(role), label: "Tổng quan", icon: "building", group: role === "owner" ? "Quản lý tổ chức" : "Không gian làm việc", mobile: true, workspaceTab: true },
    { key: "upload", href: organizationDashboardPath(role, "upload"), label: "Tải & rà soát", icon: "upload", mobile: true, workspaceTab: true },
    { key: "contracts", href: organizationDashboardPath(role, "contracts"), label: "Hợp đồng", icon: "document", count: true, mobile: true, workspaceTab: true },
    ...(["owner", "staff"].includes(role) ? [{ key: "drafts", href: "/contract-drafts", label: "Tạo hợp đồng", icon: "document" as const, mobile: true }] : []),
    ...reports,
    ...(role === "owner" ? [
      { key: "administration", href: organizationDashboardPath(role, "administration"), label: "Quản trị", icon: "team" as const, mobile: true, workspaceTab: true },
      { key: "members", href: organizationDashboardPath(role, "members"), label: "Thành viên & lời mời", icon: "team" as const, mobile: true, workspaceTab: true },
    ] : []),
    // Plans of the workspace stay inside the dashboard, as for personal accounts.
    ...supportNavigation.map((item) => (item.key === "plans" ? { ...item, key: "subscription", href: routes.subscription } : item)),
  ];
}
