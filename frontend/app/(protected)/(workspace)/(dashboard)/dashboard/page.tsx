import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { OrganizationOverviewPage } from "@/components/overview/organization-overview-page";
export default async function DashboardPage() {
  const { user } = await requirePermission("contracts");
  if (user.role === "user") redirect("/review");
  return <OrganizationOverviewPage />;
}
