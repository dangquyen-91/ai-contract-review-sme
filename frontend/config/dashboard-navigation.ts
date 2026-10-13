import type { Icon } from "@/components/ui/icon";
import type { DashboardRole } from "./dashboard-roles";

export type NavigationItem = {
  key: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  group?: string;
  href?: string;
  pending?: boolean;
  count?: boolean;
  mobile?: boolean;
};

const adminNavigation: NavigationItem[] = [
  { key: "overview", href: "/dashboard/admin", label: "Tổng quan", icon: "briefcase", group: "Không gian quản trị", mobile: true },
  { key: "organizations", href: "/dashboard/admin/organizations", label: "Tổ chức", icon: "building", pending: true, mobile: true },
  { key: "users", href: "/dashboard/admin/users", label: "Người dùng", icon: "team", pending: true, mobile: true },
  { key: "ai-jobs", href: "/dashboard/admin/ai-jobs", label: "Giám sát AI", icon: "sparkle", group: "Vận hành", pending: true, mobile: true },
  { key: "legal-sources", href: "/dashboard/admin/legal-sources", label: "Kho pháp lý", icon: "scales", mobile: true },
  { key: "reports", href: "/dashboard/admin/reports", label: "Báo cáo & thống kê", icon: "chart", pending: true, mobile: true },
  { key: "audit-log", href: "/dashboard/admin/audit-log", label: "Nhật ký quản trị", icon: "shield", pending: true, mobile: true },
];

const supportNavigation: NavigationItem[] = [
  { key: "sample-report", href: "/bao-cao-mau", label: "Báo cáo mẫu", icon: "search", group: "Hỗ trợ" },
  { key: "plans", href: "/goi-dich-vu", label: "Gói dịch vụ", icon: "sparkle" },
];

export function getDashboardNavigation(role: DashboardRole): NavigationItem[] {
  if (role === "administrator") return adminNavigation;
  if (role === "manager") return [
    { key: "overview", href: "/dashboard/manager", label: "Tổng quan", icon: "building", group: "Không gian làm việc", mobile: true },
    ...supportNavigation,
  ];
  if (role === "user") return [
    { key: "review", href: "/dashboard/user/review", label: "Tải & rà soát", icon: "upload", group: "Không gian làm việc", mobile: true },
    { key: "contract", href: "/dashboard/user/contract", label: "Hợp đồng", icon: "document", count: true, mobile: true },
    { key: "create-organization", href: "/chon-to-chuc", label: "Tạo tổ chức", icon: "building", group: "Hỗ trợ", mobile: true },
    ...supportNavigation.map((item) => ({ ...item, group: undefined })),
  ];

  return [
    { key: "overview", href: role === "owner" || role === "staff" ? `/dashboard/${role}` : undefined, label: "Tổng quan", icon: "building", group: role === "owner" ? "Quản lý tổ chức" : "Không gian làm việc", mobile: true },
    { key: "upload", href: role === "owner" || role === "staff" ? `/dashboard/${role}/review` : undefined, label: role === "reviewer" ? "Rà soát hợp đồng" : "Tải & rà soát", icon: role === "reviewer" ? "shield" : "upload", mobile: true },
    { key: "contracts", href: role === "owner" || role === "staff" ? `/dashboard/${role}/contract` : undefined, label: "Hợp đồng", icon: "document", count: true, mobile: true },
    ...(role === "owner" ? [
      { key: "administration", href: "/dashboard/owner?view=administration", label: "Quản trị", icon: "team" as const, mobile: true },
      { key: "members", href: "/dashboard/owner?view=members", label: "Thành viên & lời mời", icon: "team" as const, mobile: true },
    ] : []),
    ...supportNavigation,
  ];
}
