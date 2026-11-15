import { permissions } from "./permissions";
import type { DashboardRole } from "./dashboard-roles";

export const roleReportConfig: Record<
  DashboardRole,
  { title: string; description: string; href: string }
> = {
  administrator: {
    title: "Báo cáo vận hành hệ thống",
    description:
      "Theo dõi hiệu suất AI, thanh toán và mức sử dụng trên toàn hệ thống.",
    href: "/admin/reports",
  },
  owner: {
    title: "Báo cáo hợp đồng tổ chức",
    description:
      "Theo dõi hợp đồng, rủi ro và hạn mức AI của tổ chức bạn đang quản lý.",
    href: "/reports",
  },
  staff: {
    title: "Báo cáo công việc tổ chức",
    description:
      "Theo dõi hợp đồng, kết quả rà soát và lượt AI đã dùng trong tổ chức được phân quyền.",
    href: "/reports",
  },
  user: {
    title: "Báo cáo sử dụng cá nhân",
    description:
      "Theo dõi hợp đồng, kết quả rà soát và lượt AI trong không gian cá nhân của bạn.",
    href: "/reports",
  },
  manager: {
    title: "Báo cáo kho pháp lý",
    description:
      "Theo dõi tổ chức, hiệu lực nguồn pháp lý và tình trạng nạp dữ liệu.",
    href: "/management/reports",
  },
  expert: {
    title: "Báo cáo xác minh của tôi",
    description:
      "Theo dõi hàng đợi được phép tiếp nhận và kết quả những lần xác minh do bạn xử lý.",
    href: "/expert-verification/reports",
  },
};

export function operationalReportFeatures(role: "administrator" | "owner") {
  return {
    risks: permissions.contracts(role),
    payments: permissions.admin(role),
    workspaceRanking: permissions.admin(role),
    organizationFilter: permissions.admin(role),
  };
}
