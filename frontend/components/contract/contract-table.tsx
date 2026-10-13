"use client";

import { Icon } from "@/components/ui/icon";
import { contractTypeLabels, contractStatusLabels, contractRiskLabels, contractStatusClasses, contractRiskClasses, formatContractDate } from "@/config/contract-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardContract } from "@/types/contracts";

export function ContractTable({ contracts, canReview, onReview, isReviewing, highlightId }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean; highlightId?: string }) {
  if (!contracts.length) return <div className="min-h-[220px] flex flex-col items-center justify-center p-9 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eaf1ff] text-[#2864dc]"><Icon name="document" /></span><h3 className="mt-3 text-sm font-semibold">Chưa có hợp đồng</h3><p className="mt-1 text-xs text-[#6b778c]">Hợp đồng đầu tiên bạn tải lên sẽ xuất hiện tại đây.</p></div>;

  return <Table className="min-w-[1020px] table-fixed">
    <TableHeader className="bg-[#f9fafc]">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-[34%] text-[11px] tracking-[0.02em]">Hợp đồng</TableHead>
        <TableHead className="w-[12%] text-[11px] tracking-[0.02em]">Trạng thái</TableHead>
        <TableHead className="w-[14%] text-[11px] tracking-[0.02em]">Rủi ro</TableHead>
        <TableHead className="w-[13%] text-[11px] tracking-[0.02em]">Cập nhật</TableHead>
        <TableHead className="w-[27%] text-[11px] tracking-[0.02em]">Thao tác</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {contracts.map((contract) => <TableRow key={contract.id ?? contract._id ?? contract.title} className={highlightId && (contract.id ?? contract._id) === highlightId ? "bg-[#effaf5] shadow-[inset_3px_0_#20a078] hover:bg-[#effaf5]" : "hover:bg-[#fbfcff]"}>
        <TableCell><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-[#edf3ff] text-[#2864dc] [&_svg]:size-4"><Icon name="document" /></span><div className="min-w-0"><strong className="block truncate text-[13px] font-semibold leading-5 text-[#263750]" title={contract.title}>{contract.title}</strong><small className="block truncate text-[11px] leading-4 text-[#8996a9]">{contractTypeLabels[contract.type] ?? contract.type}</small></div></div></TableCell>
        <TableCell><span className={`inline-flex max-w-full whitespace-nowrap rounded-[5px] px-2 py-1 text-[11px] font-medium leading-4 ${contractStatusClasses[contract.status]}`}>{contractStatusLabels[contract.status]}</span></TableCell>
        <TableCell><span className={`inline-flex max-w-full whitespace-nowrap rounded-[5px] px-2 py-1 text-[11px] font-medium leading-4 ${contractRiskClasses[contract.overallRiskLevel]}`}>{contractRiskLabels[contract.overallRiskLevel]}</span></TableCell>
        <TableCell className="whitespace-nowrap text-xs tabular-nums text-[#6b7a90]"><time dateTime={contract.updatedAt}>{formatContractDate(contract.updatedAt)}</time></TableCell>
        <TableCell>{canReview && <div className="flex items-center gap-3 whitespace-nowrap">
          <button type="button" onClick={() => onReview(contract)} disabled={isReviewing || contract.status === "archived"} className="inline-flex min-h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[#d8e4fa] bg-[#f6f9ff] px-2.5 text-[11px] font-semibold text-[#2256b6] transition-colors hover:border-[#b6cdf5] hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5"><Icon name={contract.status === "reviewed" ? "document" : "sparkle"} />{contract.status === "reviewed" ? "Xem kết quả" : contract.status === "processing" ? "Theo dõi xử lý" : "AI review"}</button>
          {contract.status === "reviewed" && <button type="button" onClick={() => onReview(contract, true)} disabled={isReviewing} className="inline-flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-medium text-[#526987] transition-colors hover:bg-[#f1f5fb] hover:text-[#2256b6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5"><Icon name="sparkle" />Rà soát lại</button>}
        </div>}</TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}
