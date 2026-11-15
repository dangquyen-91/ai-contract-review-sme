import { requirePermission } from "@/lib/auth/access";
import { redirect } from "next/navigation";
import { routes } from "@/config/routes";
export default async function ManagementPage() {
  const { user } = await requirePermission("managementArea");
  redirect(user.role === "administrator" ? routes.users : routes.organizations);
}
