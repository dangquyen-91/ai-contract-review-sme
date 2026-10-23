import type { Icon } from "@/components/ui/icon";
import type { DashboardRole } from "./dashboard-roles";
import { organizationDashboardPath } from "@/lib/organization-dashboard-route";
import { userManagementPath } from "./user-management";

export type NavigationItem = {
  key: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  group?: string;
  href?: string;
  pending?: boolean;
  count?: boolean;
  mobile?: boolean;
  workspaceTab?: boolean;
};

const adminNavigation: NavigationItem[] = [
  { key: "overview", href: "/dashboard/admin", label: "Tổng quan", icon: "briefcase", group: "Không gian quản trị", mobile: true },
  { key: "organizations", href: "/dashboard/admin/organizations", label: "Tổ chức", icon: "building", pending: true, mobile: true },
  { key: "userManagement", href: userManagementPath, label: "Người dùng", icon: "team", mobile: true },
  { key: "ai-jobs", href: "/dashboard/admin/ai-jobs", label: "Giám sát AI", icon: "sparkle", group: "Vận hành", pending: true, mobile: true },
  { key: "reports", href: "/dashboard/admin/reports", label: "Báo cáo & thống kê", icon: "chart", pending: true, mobile: true },
  { key: "audit-log", href: "/dashboard/admin/audit-log", label: "Nhật ký quản trị", icon: "shield", pending: true, mobile: true },
];

const supportNavigation: NavigationItem[] = [
  { key: "sample-report", href: "/bao-cao-mau", label: "Báo cáo mẫu", icon: "search", group: "Hỗ trợ" },
  { key: "plans", href: "/goi-dich-vu", label: "Gói dịch vụ", icon: "sparkle" },
];

export function getDashboardNavigation(role: DashboardRole): NavigationItem[] {
  if (role === "administrator") return adminNavigation;
  if (role === "user") return [
    { key: "review", href: "/dashboard/user/review", label: "Tải & rà soát", icon: "upload", group: "Không gian làm việc", mobile: true },
    { key: "contract", href: "/dashboard/user/contract", label: "Hợp đồng", icon: "document", count: true, mobile: true },
    { key: "create-organization", href: "/chon-to-chuc", label: "Tạo tổ chức", icon: "building", group: "Hỗ trợ", mobile: true },
    ...supportNavigation.map((item) => ({ ...item, ...(item.key === "plans" ? { key: "subscription", href: "/dashboard/user/subscription" } : {}), group: undefined })),
  ];

  return [
    { key: "overview", href: organizationDashboardPath(role), label: "Tổng quan", icon: "building", group: role === "owner" ? "Quản lý tổ chức" : "Không gian làm việc", mobile: true, workspaceTab: true },
    { key: "upload", href: organizationDashboardPath(role, "upload"), label: role === "expert" ? "Rà soát hợp đồng" : "Tải & rà soát", icon: role === "expert" ? "shield" : "upload", mobile: true, workspaceTab: true },
    { key: "contracts", href: organizationDashboardPath(role, "contracts"), label: "Hợp đồng", icon: "document", count: true, mobile: true, workspaceTab: true },
    ...(role === "owner" ? [
      { key: "administration", href: organizationDashboardPath(role, "administration"), label: "Quản trị", icon: "team" as const, mobile: true, workspaceTab: true },
      { key: "members", href: organizationDashboardPath(role, "members"), label: "Thành viên & lời mời", icon: "team" as const, mobile: true, workspaceTab: true },
    ] : []),
    ...(role === "manager" ? [
      { key: "legal-sources", href: "/dashboard/manager/legal-sources", label: "Kho pháp lý", icon: "scales" as const, mobile: true },
    ] : []),
    ...supportNavigation,
  ];
}
