"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contractListReturnScope, readContractListReturn } from "@/lib/contracts/contract-list-return";
import type { DashboardData } from "@/types/dashboard";

export function ContractListBackButton({ data }: { data: DashboardData }) {
  const pathname = usePathname();
  const router = useRouter();
  const contractId = /^\/contract\/([a-f\d]{24})(?:\/reviews\/[a-f\d]{24})?$/i.exec(pathname)?.[1];
  if (!contractId) return null;
  return (
    <Button variant="ghost" size="sm" className="mb-4" onClick={() => {
      const previous = data.user?.email ? readContractListReturn(contractListReturnScope(data)) : null;
      router.replace(previous?.contractId === contractId ? previous.href : "/contract", { scroll: false });
    }}>
      <ArrowLeft aria-hidden="true" />Về danh sách hợp đồng
    </Button>
  );
}
