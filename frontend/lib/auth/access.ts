import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { permissions } from "@/config/permissions";
import { needsOnboarding } from "@/lib/workspace-path";
export async function requirePermission(permission: keyof typeof permissions) {
  const session = await requireSession();
  if (!permissions[permission](session.user.role)) notFound();
  if (needsOnboarding(session.user) && !["administrator", "manager", "staff", "expert"].includes(session.user.role)) redirect("/chon-to-chuc");
  return session;
}
