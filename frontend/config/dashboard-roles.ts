export type DashboardRole = "administrator" | "owner" | "manager" | "staff" | "reviewer" | "user";

export const roleAccess: Record<string, { upload: boolean; review: boolean; administer: boolean }> = {
  administrator: { upload: true, review: true, administer: true },
  owner: { upload: true, review: true, administer: true },
  manager: { upload: true, review: true, administer: false },
  staff: { upload: true, review: true, administer: false },
  reviewer: { upload: false, review: true, administer: false },
  user: { upload: true, review: true, administer: false },
};

export const roleLabels: Record<string, string> = {
  administrator: "Quản trị viên", owner: "Chủ tổ chức", manager: "Quản lý",
  staff: "Nhân viên", reviewer: "Chuyên viên rà soát", user: "Người dùng",
};
