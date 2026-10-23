import type { UserListParams } from "@/types/user-management";

export const userManagementKeys = {
  all: ["admin", "user-management"] as const,
  lists: ["admin", "user-management", "list"] as const,
  list: (params: UserListParams) => [...userManagementKeys.lists, params] as const,
  detail: (id: string) => [...userManagementKeys.all, "detail", id] as const,
};
