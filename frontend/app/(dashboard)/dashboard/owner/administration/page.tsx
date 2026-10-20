import type { Metadata } from "next";
import { OrganizationAdministrationPage } from "@/components/organizations/organization-administration-page";

export const metadata: Metadata = { title: "Quản trị tổ chức | LawScan" };

export default function AdministrationPage() {
  return <OrganizationAdministrationPage />;
}
