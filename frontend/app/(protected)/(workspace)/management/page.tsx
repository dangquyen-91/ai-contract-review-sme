import { requirePermission } from "@/lib/auth/access";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
import { RoleInsights } from "@/components/overview/role-insights";
export default async function ManagementPage() {
  const { user } = await requirePermission("managementArea");
  if (user.role === "administrator") redirect(routes.users);
  return <RoleInsights role="manager" heading />;
}
