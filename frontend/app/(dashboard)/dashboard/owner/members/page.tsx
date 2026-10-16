import type { Metadata } from "next";
import { OwnerMembersPage } from "@/components/dashboard/owner/owner-management-page";

export const metadata: Metadata = { title: "Thành viên & lời mời | LawScan" };

export default function MembersPage() {
  return <OwnerMembersPage />;
}
