import type { AuthUser } from "@/types/auth";

export function needsOnboarding(user: AuthUser) {
  const isOrganizationMember = Boolean(user.orgId)
    && ["owner", "manager", "staff", "reviewer"].includes(user.role);
  return !user.hasCompletedOnboarding && !isOrganizationMember;
}

export function workspacePath(user: AuthUser | null) {
  if (!user) return "/dang-nhap";
  if (user.role === "administrator") return "/dashboard/admin";
  if (user.role === "staff") return "/dashboard/staff";
  if (user.role === "reviewer") return "/dashboard/reviewer";
  if (needsOnboarding(user)) return "/chon-to-chuc";
  return ["owner", "manager"].includes(user.role)
    ? "/dashboard/owner"
    : "/dashboard/user";
}
