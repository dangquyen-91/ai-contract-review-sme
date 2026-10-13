"use client";
import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { OrganizationAdministrationView } from "./organization-administration-view";
export function OrganizationAdministrationPage() {
const { data, access, roleLabel, selectTab } = useOrganizationDashboard();
if (!data || !access.administer) return null;
return <OrganizationAdministrationView organization={data.organization} roleLabel={roleLabel} onMembers={() => selectTab("members")} />;
}
