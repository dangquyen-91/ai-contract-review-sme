"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ContractDeleteButton } from "./contract-delete-button";
import type { DashboardContract } from "@/types/contracts";

export function ContractRowActions({ contract, canReview, canDelete, isReviewing, onReview, onDeleted }: {
  contract: DashboardContract;
  canReview: boolean;
  canDelete: boolean;
  isReviewing: boolean;
  onReview: (contract: DashboardContract, rerun?: boolean) => void;
  onDeleted?: () => void;
}) {
  return <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
    {canReview && <>
      <Button variant="secondary" size="sm" className="min-w-32" onClick={() => onReview(contract)} disabled={isReviewing || contract.status === "archived"}>
        <Icon name={contract.status === "reviewed" ? "document" : "sparkle"} />
        {contract.status === "reviewed" ? "Xem kết quả" : contract.status === "processing" ? "Theo dõi xử lý" : "AI review"}
      </Button>
      {contract.status === "reviewed" && <Button variant="outline" size="sm" onClick={() => onReview(contract, true)} disabled={isReviewing}><Icon name="sparkle" />Rà soát lại</Button>}
    </>}
    {canDelete && <ContractDeleteButton contract={contract} onDeleted={onDeleted} />}
  </div>;
}
