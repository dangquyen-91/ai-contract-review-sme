"use client";
import { useOrganizationDashboard } from "@/providers/dashboard-provider";
import { MembersWorkspace } from "./members-workspace";
export function OrganizationMembersPage() {
const { data } = useOrganizationDashboard();
if (!data || data.role !== "owner") return null;
return <MembersWorkspace orgId={data.organization.id} organizationName={data.organization.name} />;
}
