"use client";

import { Button } from "@/components/ui/button";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { Fragment, useState } from "react";
import { ContractTable } from "@/components/contract/contract-table";
import { Icon } from "@/components/ui/icon";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { paginationPageParser } from "@/hooks/use-pagination-page";
import { useContractsList } from "@/hooks/use-contracts";
import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";

type ContractContentProps = DashboardWorkspaceContext & {
  onReview?: (contract: DashboardContract, rerun?: boolean) => void;
  isReviewing?: boolean;
};

export function ContractContent({ data, access, onReview, isReviewing = false }: ContractContentProps) {
  const router = useRouter();
  function openReview(contract: DashboardContract, rerun = false) {
    const contractId = contract.id ?? contract._id;
    if (!contractId) return;
    router.push(`/dashboard/${data.role}/review?contract=${encodeURIComponent(contractId)}${rerun ? "&rerun=1" : ""}`);
  }
  return <ContractsView contracts={data.contracts} totalContracts={data.totalContracts} scope={`${data.role}:${data.organization.id}`} canDelete={["administrator", "owner", "manager", "user"].includes(data.role)} canReview={access.review} onReview={onReview ?? openReview} isReviewing={isReviewing} />;
}

const contractListParams = { page: paginationPageParser, search: parseAsString.withDefault(""), status: parseAsString.withDefault(""), riskLevel: parseAsString.withDefault("") };

const contractFilterChoices: { label: string; filter: DashboardContractFilter }[] = [
  { label: "Tất cả", filter: {} },
  { label: "Chờ rà soát", filter: { status: "uploaded" } },
  { label: "AI đang xử lý", filter: { status: "processing" } },
  { label: "Đã có kết quả", filter: { status: "reviewed" } },
  { label: "Rủi ro cao", filter: { riskLevel: "high" } },
];

function ContractSearchForm({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(search);

  return <form className="flex w-full flex-wrap items-center gap-2 sm:w-auto" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}>
    <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dce4ef] bg-white px-3 text-[#8290a3] sm:w-64">
      <Icon name="search" className="h-4 w-4 shrink-0" />
      <span className="sr-only">Tìm kiếm hợp đồng</span>
      <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tìm theo tên hợp đồng..." className="min-w-0 flex-1 bg-transparent text-xs text-[#263750] outline-none focus-visible:!outline-none placeholder:text-[#9aa6b7]" />
    </label>
    <Button variant="default" size="sm" type="submit" >Tìm kiếm</Button>
    {search && <Button variant="outline" size="sm" type="button" onClick={() => { setDraft(""); onSearch(""); }} >Xóa</Button>}
  </form>;
}

function ContractsView({ contracts, totalContracts, scope, canReview, onReview, isReviewing, canDelete }: { contracts: DashboardContract[]; totalContracts: number; scope: string; canReview: boolean; canDelete: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("uploaded") ?? undefined;
  const [{ page, search, status, riskLevel }, setListState] = useQueryStates(contractListParams, { history: "push" });
  const filter: DashboardContractFilter = {
    ...(["uploaded", "processing", "reviewed", "archived"].includes(status) ? { status: status as ContractStatus } : {}),
    ...(["high", "medium", "low", "none"].includes(riskLevel) ? { riskLevel: riskLevel as ContractRiskLevel } : {}),
  };
  const filtered = Boolean(search || filter.status || filter.riskLevel);
  const requestedPage = filtered ? page : Math.min(page, Math.max(1, Math.ceil(totalContracts / 10)));
  const { data: pageData, error, isLoading, refetch } = useContractsList(
    { ...filter, page: requestedPage, search: search || undefined },
    { scope, initialData: requestedPage === 1 && !filtered ? { items: contracts, total: totalContracts } : undefined, pollProcessing: true },
  );
  const uploaded = highlightId && pageData?.items.find((contract) => (contract.id ?? contract._id) === highlightId);
  const total = pageData?.total ?? (filtered ? 0 : totalContracts);
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
      <div className="flex flex-wrap gap-2 border-b border-[color:var(--line)] px-[21px] py-3" aria-label="Lọc hợp đồng">
        {contractFilterChoices.map((choice) => <Button className="border border-border bg-white font-medium text-[#52647e] shadow-none hover:bg-[#f5f8fc] hover:text-[#263750] aria-pressed:border-[#c6d7f5] aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-accent-foreground" variant="ghost" size="sm" key={choice.label} type="button" aria-pressed={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel} onClick={() => void setListState({ page: 1, status: choice.filter.status ?? "", riskLevel: choice.filter.riskLevel ?? "" })} >{choice.label}</Button>)}
      </div>
      {uploaded && <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#bde4d1] bg-[#effaf5] p-4 text-sm text-[#176747]" role="status"><div><strong>Hợp đồng vừa tải lên</strong><p className="mt-1">{uploaded.title} · Đã lưu tài liệu. Bạn có thể bắt đầu rà soát từ danh sách bên dưới.</p></div><Button variant="outline" size="sm" type="button" aria-label="Ẩn thông báo tải lên"  onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.delete("uploaded"); router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }); }}>×</Button></div>}
      {error ? <div role="alert" className="p-8 text-center text-sm text-[#5e6d82]">Không thể tải danh sách hợp đồng. <Button variant="link" size="sm" type="button" onClick={() => refetch()} >Thử lại</Button></div>
        : isLoading ? <div className="p-8 text-center text-sm text-[#6b778c]" aria-busy="true">Đang tải hợp đồng...</div>
        : pageData?.items.length === 0 && filtered ? <p className="p-8 text-center text-sm text-[#6b778c]">{search ? `Không tìm thấy hợp đồng phù hợp với “${search}”.` : "Không có hợp đồng phù hợp với bộ lọc."}</p>
        : <ContractTable contracts={pageData?.items ?? []} highlightId={highlightId} canReview={canReview} canDelete={canDelete} onDeleted={() => { if (pageData?.items.length === 1 && currentPage > 1) void setListState({ page: currentPage - 1 }); }} onReview={onReview} isReviewing={isReviewing} />}
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
