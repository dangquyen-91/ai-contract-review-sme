import type { Metadata } from "next";
import { OrganizationMembersPage } from "@/components/members/members-page";

export const metadata: Metadata = { title: "Thành viên & lời mời | LawScan" };

export default function MembersPage() {
  return <OrganizationMembersPage />;
}
