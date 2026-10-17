"use client";
import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { OrganizationAdministrationView } from "./organization-administration-view";
import { OrganizationDeleteSection } from "./organization-delete-section";
import { SubscriptionManagement } from "@/components/subscription/subscription-management";
export function OrganizationAdministrationPage() {
const { data, access, roleLabel, selectTab } = useOrganizationDashboard();
if (!data || !access.administer) return null;
return <><OrganizationAdministrationView organization={data.organization} roleLabel={roleLabel} onMembers={() => selectTab("members")} />{data.role === "owner" && <SubscriptionManagement orgId={data.organization.id} />}<OrganizationDeleteSection organization={data.organization} /></>;
}
