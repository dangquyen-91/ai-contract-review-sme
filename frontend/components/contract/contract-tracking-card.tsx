"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contractTypeLabels, formatContractDate } from "@/config/contract-display";
import { ContractCardMenu } from "./contract-card-menu";
import { ContractVerificationDetails } from "./contract-verification-details";
import { AiResultFact, ExpertFact } from "./contract-tracking-facts";
import { ContractVersionChip, contractVersionNumber } from "./contract-version-info";
import type { DashboardContract } from "@/types/contracts";

const primaryLabels: Record<DashboardContract["status"], string> = {
  reviewed: "Xem báo cáo",
  processing: "Theo dõi xử lý",
  uploaded: "Bắt đầu rà soát",
  unsupported: "Xem tài liệu",
  archived: "Xem báo cáo",
};

function cardTone(highlighted: boolean, returned: boolean) {
  if (highlighted) return "border-emerald-300 ring-2 ring-emerald-100";
  if (returned) return "border-amber-200 border-l-4 border-l-amber-400";
  return "border-border";
}

function ContractIdentity({ contract, canOpen, onOpen }: { contract: DashboardContract; canOpen: boolean; onOpen: () => void }) {
  const versions = contractVersionNumber(contract);
  const meta = [
    contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại",
    versions > 1 ? `${versions} phiên bản` : null,
    `Cập nhật ${formatContractDate(contract.updatedAt)}`,
  ].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
        <FileText aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <h3 className="m-0 min-w-0 text-ui-section font-semibold [overflow-wrap:anywhere]">
          {canOpen ? (
            <button type="button" onClick={onOpen} className="inline p-0 text-left hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              {contract.title}
            </button>
          ) : contract.title}
          <span className="ml-2 inline-flex align-[2px]"><ContractVersionChip contract={contract} /></span>
        </h3>
        <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}

export function ContractTrackingCard({ contract, highlighted, canReview, canDelete, isReviewing, onReview, onDeleted }: {
  contract: DashboardContract; highlighted: boolean; canReview: boolean; canDelete: boolean;
  isReviewing: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; onDeleted?: () => void;
}) {
  const [tracking, setTracking] = useState(false);
  const verification = contract.expertVerification;
  const returned = verification?.status === "returned";
  const canOpen = canReview && !isReviewing && contract.status !== "archived";
  const open = () => onReview(contract);
  return (
    <article
      data-contract-id={contract.id ?? contract._id}
      tabIndex={-1}
      className={`grid min-w-0 gap-4 rounded-xl border bg-card p-4 text-card-foreground transition-[border-color,box-shadow] duration-200 hover:border-blue-200 hover:shadow-[0_6px_22px_-12px_rgb(37_99_235_/_0.3)] focus-within:border-blue-300 motion-reduce:transition-none sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(140px,170px)_minmax(160px,205px)_auto] lg:items-start lg:gap-5 ${cardTone(highlighted, returned)}`}
    >
      <ContractIdentity contract={contract} canOpen={canOpen} onOpen={open} />
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 lg:contents">
        <AiResultFact contract={contract} />
        <ExpertFact contract={contract} onOpen={() => setTracking(true)} />
      </div>
      <div className="flex items-center gap-2 sm:justify-end lg:self-center">
        {canReview && (
          <Button size="sm" className="flex-1 sm:flex-none" disabled={!canOpen} onClick={open}>
            {primaryLabels[contract.status]}
          </Button>
        )}
        <ContractCardMenu contract={contract} canUpload={canReview} canDelete={canDelete} onDeleted={onDeleted} />
      </div>
      {tracking && verification && (
        <ContractVerificationDetails contract={contract} onClose={() => setTracking(false)} onOpenReport={open} />
      )}
    </article>
  );
}
