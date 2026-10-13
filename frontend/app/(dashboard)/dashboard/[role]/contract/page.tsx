import type { Metadata } from "next";
import { ContractDashboardPage } from "@/components/contract/contract-page";
import { requireDashboardRole } from "@/lib/dashboard-route-access";

export const metadata: Metadata = { title: "Hợp đồng | LawScan", robots: { index: false, follow: false } };

export default async function ContractPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  await requireDashboardRole(role);
  return <ContractDashboardPage />;
}
