"use client";

import { useRouter } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { Fragment, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { contractTypeLabels, contractStatusLabels, contractRiskLabels, contractStatusClasses, contractRiskClasses, formatContractDate } from "@/config/contract-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { paginationPageParser } from "@/hooks/use-pagination-page";
import { useContractsList } from "@/hooks/use-contracts";
import type { DashboardContract } from "@/types/contracts";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";

export function ContractContent({ data, access }: DashboardWorkspaceContext) {
  const router = useRouter();
  function openReview(contract: DashboardContract, rerun = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId) return;
    router.push(`/dashboard/${data.role}/review?contract=${encodeURIComponent(contractId)}${rerun ? "&rerun=1" : ""}`);
  }
  return <ContractsView contracts={data.contracts} totalContracts={data.totalContracts} canReview={access.review} onReview={openReview} isReviewing={false} />;
}

const contractListParams = { page: paginationPageParser, search: parseAsString.withDefault("") };

function ContractSearchForm({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(search);

  return <form className="flex w-full flex-wrap items-center gap-2 sm:w-auto" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}>
    <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dce4ef] bg-white px-3 text-[#8290a3] sm:w-64">
      <Icon name="search" className="h-4 w-4 shrink-0" />
      <span className="sr-only">Tìm kiếm hợp đồng</span>
      <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tìm theo tên hợp đồng..." className="min-w-0 flex-1 bg-transparent text-xs text-[#263750] outline-none focus-visible:!outline-none placeholder:text-[#9aa6b7]" />
    </label>
    <button type="submit" className="min-h-10 rounded-lg bg-[#2864dc] px-3 text-xs font-semibold text-white hover:bg-[#1f4fb2]">Tìm kiếm</button>
    {search && <button type="button" onClick={() => { setDraft(""); onSearch(""); }} className="min-h-10 rounded-lg px-2 text-xs font-semibold text-[#526987] hover:bg-[#f1f5fb]">Xóa</button>}
  </form>;
}

function ContractsView({ contracts, totalContracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; totalContracts: number; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
  const [{ page, search }, setListState] = useQueryStates(contractListParams, { history: "push" });
  const requestedPage = search ? page : Math.min(page, Math.max(1, Math.ceil(totalContracts / 10)));
  const { data: pageData, error, isLoading, refetch } = useContractsList(
    { page: requestedPage, search: search || undefined },
    { queryKey: ["dashboard", "contracts", requestedPage, search], initialData: requestedPage === 1 && !search ? { items: contracts, total: totalContracts } : undefined },
  );
  const total = pageData?.total ?? (search ? 0 : totalContracts);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const currentPage = Math.min(requestedPage, totalPages);
  const visiblePages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter((number) => number >= 1 && number <= totalPages)
    .sort((left, right) => left - right);

  return <>
    <section className="flex items-end justify-between gap-7 max-[580px]:items-start max-[580px]:flex-col">
      <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#2864dc]">Kho tài liệu</p><h1 className="mt-2 text-[clamp(30px,3vw,42px)] font-bold leading-tight">Tất cả hợp đồng</h1><p className="mt-2 text-sm text-[#6b778c]">Theo dõi trạng thái xử lý và mức rủi ro của các hợp đồng.</p></div>
    </section>
    <section className="mt-7 min-w-0 overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-white shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--line)] px-[21px] py-[18px]">
        <div><h2 className="text-sm font-semibold">Danh sách hợp đồng</h2><p className="mt-1 text-xs text-[#6b778c]">{total} tài liệu</p></div>
        <ContractSearchForm key={search} search={search} onSearch={(value) => void setListState({ page: 1, search: value })} />
      </header>
      {error ? <div role="alert" className="p-8 text-center text-sm text-[#5e6d82]">Không thể tải danh sách hợp đồng. <button type="button" onClick={() => refetch()} className="font-semibold text-[#2256b6] underline">Thử lại</button></div>
        : isLoading ? <div className="p-8 text-center text-sm text-[#6b778c]" aria-busy="true">Đang tải hợp đồng...</div>
        : pageData?.items.length === 0 && search ? <p className="p-8 text-center text-sm text-[#6b778c]">Không tìm thấy hợp đồng phù hợp với “{search}”.</p>
        : <ContractTable contracts={pageData?.items ?? []} canReview={canReview} onReview={onReview} isReviewing={isReviewing} />}
      {!error && !isLoading && totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] px-4 py-3">
        <p className="text-xs text-[#6b778c]">{(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, total)} / {total} hợp đồng</p>
        <Pagination className="w-auto justify-end">
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => void setListState({ page: Math.max(1, currentPage - 1) })} disabled={currentPage === 1} /></PaginationItem>
            {visiblePages.map((number, index) => <Fragment key={number}>
              {index > 0 && number - visiblePages[index - 1] > 1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              <PaginationItem><PaginationLink isActive={number === currentPage} aria-label={`Trang ${number}`} onClick={() => void setListState({ page: number })}>{number}</PaginationLink></PaginationItem>
            </Fragment>)}
            <PaginationItem><PaginationNext onClick={() => void setListState({ page: Math.min(totalPages, currentPage + 1) })} disabled={currentPage === totalPages} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>}
    </section>
  </>;
}
function ContractTable({ contracts, canReview, onReview, isReviewing }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
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
      {contracts.map((contract) => <TableRow key={contract.id ?? contract._id ?? contract.title} className="hover:bg-[#fbfcff]">
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

