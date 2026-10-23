"use client";

import { ContractRowActions } from "./contract-row-actions";

import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { contractTypeLabels, contractStatusLabels, contractRiskLabels, contractStatusTones, contractRiskTones, formatContractDate } from "@/config/contract-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardContract } from "@/types/contracts";

export function ContractTable({ contracts, canReview, onReview, isReviewing, highlightId, canDelete = false, onDeleted }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean; highlightId?: string; canDelete?: boolean; onDeleted?: () => void }) {
  if (!contracts.length) return <div className="min-h-[220px] flex flex-col items-center justify-center p-9 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eaf1ff] text-[#2864dc]"><Icon name="document" /></span><h3 className="mt-3 text-sm font-semibold">Chưa có hợp đồng</h3><p className="mt-1 text-ui-meta text-[#6b778c]">Hợp đồng đầu tiên bạn tải lên sẽ xuất hiện tại đây.</p></div>;

  return <Table className="min-w-[1100px] table-fixed">
    <TableHeader className="bg-[#f9fafc]">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-[31%] text-ui-caption tracking-[0.02em]">Hợp đồng</TableHead>
        <TableHead className="w-[12%] text-ui-caption tracking-[0.02em]">Trạng thái</TableHead>
        <TableHead className="w-[11%] text-ui-caption tracking-[0.02em]">Rủi ro</TableHead>
        <TableHead className="w-[12%] text-ui-caption tracking-[0.02em]">Cập nhật</TableHead>
        <TableHead className="w-[34%] text-ui-caption tracking-[0.02em]">Thao tác</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {contracts.map((contract) => <TableRow key={contract.id ?? contract._id ?? contract.title} className={highlightId && (contract.id ?? contract._id) === highlightId ? "bg-[#effaf5] shadow-[inset_3px_0_#20a078] hover:bg-[#effaf5]" : "hover:bg-[#fbfcff]"}>
        <TableCell><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#edf3ff] text-[#2864dc] [&_svg]:size-4"><Icon name="document" /></span><div className="min-w-0"><strong className="block truncate text-ui font-semibold leading-5 text-[#263750]" title={contract.title}>{contract.title}</strong><small className="block truncate text-ui-caption leading-4 text-[#8996a9]">{contract.type ? contractTypeLabels[contract.type] ?? contract.type : "Chưa xác nhận loại"}</small></div></div></TableCell>
        <TableCell><Badge variant={contractStatusTones[contract.status]}>{contractStatusLabels[contract.status]}</Badge></TableCell>
        <TableCell><Badge variant={contractRiskTones[contract.overallRiskLevel]}>{contractRiskLabels[contract.overallRiskLevel]}</Badge></TableCell>
        <TableCell className="whitespace-nowrap text-ui-meta tabular-nums text-[#6b7a90]"><time dateTime={contract.updatedAt}>{formatContractDate(contract.updatedAt)}</time></TableCell>
        <TableCell><ContractRowActions contract={contract} canReview={canReview} canDelete={canDelete} isReviewing={isReviewing} onReview={onReview} onDeleted={onDeleted} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}
