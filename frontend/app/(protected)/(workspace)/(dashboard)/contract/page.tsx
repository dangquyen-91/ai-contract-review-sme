import type { Metadata } from "next";
import { ContractDashboardPage } from "@/components/contract/contract-page";

export const metadata: Metadata = { title: "Hợp đồng | LawScan" };

export default function ContractPage() {
  return <ContractDashboardPage />;
}
