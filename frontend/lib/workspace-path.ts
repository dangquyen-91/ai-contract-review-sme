import { routes } from "@/config/routes";
import type { AuthUser } from "@/types/auth";

export function needsOnboarding(user: AuthUser) {
  const isOrganizationMember = Boolean(user.orgId)
    && ["owner", "manager", "staff", "expert"].includes(user.role);
  return !user.hasCompletedOnboarding && !isOrganizationMember;
}

export function workspacePath(user: AuthUser | null) {
  if (!user) return "/dang-nhap";
  if (["administrator", "manager", "staff", "expert"].includes(user.role)) return routes.home(user.role);
  if (needsOnboarding(user)) return "/chon-to-chuc";
  return user.role === "user" ? routes.reviewWorkspace : routes.dashboard;
}
