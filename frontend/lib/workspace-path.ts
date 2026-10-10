import type { AuthUser } from "@/types/auth";

export function workspacePath(user: AuthUser | null) {
  if (!user) return "/dang-nhap";
  if (user.role === "administrator") return "/dashboard/admin";
  if (!user.hasCompletedOnboarding) return "/chon-to-chuc";
  return ["owner", "manager"].includes(user.role)
    ? "/dashboard/owner"
    : "/dashboard/user";
}
