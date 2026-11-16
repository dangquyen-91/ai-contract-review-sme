import { requirePermission } from "@/lib/auth/access";
import type { Metadata } from "next";
import { OrganizationMembersPage } from "@/components/members/members-page";

export const metadata: Metadata = { title: "Thành viên & lời mời | LawScan" };

export default async function MembersPage() {
  await requirePermission("members");
  return <OrganizationMembersPage />;
}
