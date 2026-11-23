"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

type RowProps = {
  contract: DashboardContract;
  highlighted: boolean;
  canReview: boolean;
  canDelete: boolean;
  isReviewing: boolean;
  onReview: (contract: DashboardContract, rerun?: boolean) => void;
};

function rowTone(highlighted: boolean, returned: boolean) {
  if (highlighted) return "bg-emerald-50/60 max-lg:border-emerald-300 max-lg:ring-2 max-lg:ring-emerald-100";
  if (returned) return "max-lg:border-l-4 max-lg:border-l-amber-400 lg:[&>td:first-child]:shadow-[inset_3px_0_0_#fbbf24]";
  return "";
}

function ContractTitle({ contract, canOpen, onOpen }: { contract: DashboardContract; canOpen: boolean; onOpen: () => void }) {
  const versions = contractVersionNumber(contract);
  const type = contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại";
  const mobileMeta = [type, `Cập nhật ${formatContractDate(contract.updatedAt)}`].join(" · ");
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
        <FileText aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="m-0 min-w-0 text-ui font-semibold [overflow-wrap:anywhere]">
          {canOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="inline p-0 text-left hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {contract.title}
            </button>
          ) : contract.title}
          <span className="ml-2 inline-flex align-[1px]"><ContractVersionChip contract={contract} /></span>
        </h3>
        {versions > 1 && <p className="mb-0 mt-1 hidden text-ui-meta text-muted-foreground lg:block">{versions} phiên bản</p>}
        <p className="mb-0 mt-1 text-ui-meta text-muted-foreground lg:hidden">{mobileMeta}</p>
      </div>
    </div>
  );
}

function ContractTrackingRow({ contract, highlighted, canReview, canDelete, isReviewing, onReview }: RowProps) {
  const [tracking, setTracking] = useState(false);
  const verification = contract.expertVerification;
  const canOpen = canReview && !isReviewing && contract.status !== "archived";
  const open = () => onReview(contract);
  return (
    <TableRow
      data-contract-id={contract.id ?? contract._id}
      tabIndex={-1}
      className={`align-top outline-none max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:rounded-xl max-lg:border max-lg:border-border max-lg:bg-card max-lg:p-4 max-lg:hover:bg-card lg:focus-visible:bg-blue-50/40 ${rowTone(highlighted, verification?.status === "returned")}`}
    >
      <TableCell className="whitespace-normal max-lg:col-span-2 max-lg:p-0 lg:min-w-56 lg:max-w-96 lg:align-top">
        <ContractTitle contract={contract} canOpen={canOpen} onOpen={open} />
      </TableCell>
      <TableCell className="hidden text-ui-meta text-muted-foreground lg:table-cell lg:align-top">
        {contractTypeLabels[contract.type ?? ""] ?? "Chưa xác định loại"}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-ui-meta tabular-nums text-muted-foreground lg:table-cell lg:align-top">
        {formatContractDate(contract.updatedAt)}
      </TableCell>
      <TableCell className="whitespace-normal max-lg:rounded-lg max-lg:bg-muted/40 max-lg:p-3 lg:w-44 lg:align-top">
        <AiResultFact contract={contract} />
      </TableCell>
      <TableCell className="whitespace-normal max-lg:rounded-lg max-lg:bg-muted/40 max-lg:p-3 lg:w-52 lg:align-top">
        <ExpertFact contract={contract} onOpen={() => setTracking(true)} />
      </TableCell>
      <TableCell className="max-lg:col-span-2 max-lg:p-0 lg:w-px lg:align-top">
        <div className="flex items-center gap-2 lg:justify-end">
          {canReview && (
            <Button size="sm" className="flex-1 whitespace-nowrap lg:flex-none" disabled={!canOpen} onClick={open}>
              {primaryLabels[contract.status]}
            </Button>
          )}
          <ContractCardMenu contract={contract} canUpload={canReview} canDelete={canDelete} />
        </div>
        {tracking && verification && (
          <ContractVerificationDetails contract={contract} onClose={() => setTracking(false)} onOpenReport={open} />
        )}
      </TableCell>
    </TableRow>
  );
}

export function ContractTrackingTable({ contracts, highlightId, ...rowProps }: Omit<RowProps, "contract" | "highlighted"> & {
  contracts: DashboardContract[];
  highlightId?: string | null;
}) {
  return (
    <Table className="max-lg:block">
      <TableHeader className="hidden lg:table-header-group">
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-ui-caption uppercase tracking-wide">Hợp đồng</TableHead>
          <TableHead className="text-ui-caption uppercase tracking-wide">Loại</TableHead>
          <TableHead className="text-ui-caption uppercase tracking-wide">Cập nhật</TableHead>
          <TableHead className="text-ui-caption uppercase tracking-wide">Kết quả AI</TableHead>
          <TableHead className="text-ui-caption uppercase tracking-wide">Chuyên gia</TableHead>
          <TableHead><span className="sr-only">Thao tác</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="max-lg:block max-lg:space-y-3 max-lg:[&_tr:last-child]:!border lg:table-row-group">
        {contracts.map((contract) => {
          const id = contract.id ?? contract._id;
          return <ContractTrackingRow key={id} contract={contract} highlighted={id === highlightId} {...rowProps} />;
        })}
      </TableBody>
    </Table>
  );
}
