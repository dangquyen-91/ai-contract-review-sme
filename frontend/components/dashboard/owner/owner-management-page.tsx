"use client";

import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { AdministrationView } from "./administration-view";
import { OwnerMembersView } from "./owner-members-view";

export function OwnerAdministrationPage() {
  const { data, access, roleLabel, selectTab } = useOrganizationDashboard();
  if (!data || !access.administer) return null;
  return <AdministrationView organization={data.organization} roleLabel={roleLabel} onMembers={() => selectTab("members")} />;
}

export function OwnerMembersPage() {
  const { data } = useOrganizationDashboard();
  if (!data || data.role !== "owner") return null;
  return <OwnerMembersView orgId={data.organization.id} organizationName={data.organization.name} />;
}
