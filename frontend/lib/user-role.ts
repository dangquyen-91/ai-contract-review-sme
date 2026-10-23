import type { ManagedUserRole } from "@/types/user-management";

const userRoleLabels: Record<ManagedUserRole, string> = {
  administrator: "Quản trị viên",
  user: "Người dùng cá nhân",
  owner: "Chủ tổ chức",
  manager: "Quản lý",
  staff: "Nhân viên",
  expert: "Chuyên gia",
};

export function getUserRoleLabel(role: ManagedUserRole) {
  return userRoleLabels[role] ?? "Không xác định";
}

export const userRoleOptions = (Object.keys(userRoleLabels) as ManagedUserRole[]).map((value) => ({
  value,
  label: getUserRoleLabel(value),
}));
