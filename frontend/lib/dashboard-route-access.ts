import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { needsOnboarding, workspacePath } from "@/lib/workspace-path";

export async function requireDashboardRole(role: string) {
  if (role !== "user" && role !== "owner" && role !== "manager" && role !== "staff") notFound();
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role !== role) redirect(workspacePath(user));
  if ((role === "staff" || role === "manager") && !user.orgId) redirect(`/dashboard/${role}`);
  if (needsOnboarding(user)) redirect("/chon-to-chuc");
}
