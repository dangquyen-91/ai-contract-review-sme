import type { Metadata } from "next";
import { OwnerAdministrationPage } from "@/components/dashboard/owner/owner-management-page";

export const metadata: Metadata = { title: "Quản trị tổ chức | LawScan" };

export default function AdministrationPage() {
  return <OwnerAdministrationPage />;
}
