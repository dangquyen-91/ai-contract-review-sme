import { requirePermission } from "@/lib/auth/access";
import { OrganizationOverviewPage } from "@/components/overview/organization-overview-page";
import { PersonalOverview } from "@/components/overview/personal-overview";
export default async function DashboardPage() {
  const { user } = await requirePermission("contracts");
  if (user.role === "user") return <PersonalOverview accountId={user.id} />;
  return <OrganizationOverviewPage />;
}
