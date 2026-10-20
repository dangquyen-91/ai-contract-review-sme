"use client";

import { Button } from "@/components/ui/button";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useContractsList } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardContract } from "@/types/contracts";
import { paginationPageParser } from "@/hooks/use-pagination-page";

const listSearchParams = {
  page: paginationPageParser,
  search: parseAsString.withDefault(""),
};

export function OrganizationContractsView({ orgId, filter, reviewerMode, managerMode = false, onFilter, renderContracts }: {
  orgId: string;
  filter: DashboardContractFilter;
  reviewerMode: boolean;
  managerMode?: boolean;
  onFilter: (filter?: DashboardContractFilter) => void;
  renderContracts: (contracts: DashboardContract[], onDeleted: () => void) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [{ page, search }, setListState] = useQueryStates(
    listSearchParams,
    { history: "push" },
  );
  const highlighted = params.get("uploaded") || undefined;
  const [draft, setDraft] = useState(search);
  function updateList(next: { page?: number; search?: string }) {
    void setListState({ page: next.page ?? page, search: next.search ?? search });
  }
  const query = useContractsList({ ...filter, page, search: search || undefined }, { scope: `${managerMode ? "manager" : reviewerMode ? "reviewer" : "staff"}:${orgId}`, pollProcessing: true });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  const uploaded = highlighted && query.data?.items.find((contract) => (contract.id ?? contract._id) === highlighted);
  const choices: { label: string; filter: DashboardContractFilter }[] = [
    { label: "Tất cả", filter: {} },
    ...((reviewerMode || managerMode) ? [{ label: "Rủi ro cao", filter: { riskLevel: "high" } as DashboardContractFilter }, { label: "Đã có kết quả", filter: { status: "reviewed" } as DashboardContractFilter }] : []),
    ...(!reviewerMode ? [{ label: "Chờ rà soát", filter: { status: "uploaded" } as DashboardContractFilter }] : []),
    { label: "AI đang xử lý", filter: { status: "processing" } },
  ];
  const statusNames = { uploaded: "Chờ rà soát", processing: "AI đang xử lý", reviewed: "Đã rà soát", archived: "Lưu trữ" };
  const riskNames = { high: "Rủi ro cao", medium: "Rủi ro trung bình", low: "Rủi ro thấp", none: "Chưa đánh giá" };
  return <section className={"min-w-[0] [border:1px_solid_#e1e8f2] rounded-[18px] [background:#fff] p-[24px] shadow-[0_18px_35px_-34px_#4b668b] mt-[20px] [&_form]:flex [&_form]:flex-wrap [&_form]:gap-[10px] [&_form]:m-[18px_0] [&_input]:flex-1 [&_input]:min-w-[150px] [&_input]:min-h-[42px] [&_input]:p-[8px_12px] [&_input]:[border:1px_solid_#dce5f2] [&_input]:rounded-[9px] [&_input]:text-[13px] [&_form_button]:[border:1px_solid_#dce5f2] [&_form_button]:rounded-[9px] [&_form_button]:[background:white] [&_form_button]:p-[9px_14px] [&_form_button]:text-[#245bd6] [&_form_button]:text-[13px] [&_form_button]:font-semibold [&_form_button]:cursor-pointer max-[650px]:p-[20px]"} aria-labelledby="member-contracts-heading">
    <h1 id="member-contracts-heading" className="text-[28px] font-bold tracking-[-.03em]">Hợp đồng của tổ chức</h1>
    <p className={"mt-[7px]! text-[#708099] text-[12px] leading-[1.6]"}>{[filter.status && statusNames[filter.status], filter.riskLevel && riskNames[filter.riskLevel]].filter(Boolean).join(" · ") || "Tất cả hợp đồng"} · {query.data ? `${query.data.total} kết quả` : query.error ? "Chưa tải được dữ liệu" : "Đang tải…"}</p>
    {uploaded && <div className={"flex items-start justify-between gap-[14px] mt-[18px] p-[16px] [border:1px_solid_#bde4d1] rounded-[12px] [background:#effaf5] text-[#176747] [&_strong]:text-[14px] [&_p]:m-[6px_0_0] [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:wrap-anywhere [&_button:not([data-slot=button])]:min-w-[36px] [&_button:not([data-slot=button])]:min-h-[36px] [&_button:not([data-slot=button])]:[border:0] [&_button:not([data-slot=button])]:rounded-[8px] [&_button:not([data-slot=button])]:[background:transparent] [&_button:not([data-slot=button])]:text-[inherit] [&_button:not([data-slot=button])]:text-[22px] [&_button:not([data-slot=button])]:cursor-pointer"} role="status"><div><strong>Hợp đồng vừa tải lên</strong><p>{uploaded.title} · Đã lưu tài liệu. Bạn có thể bắt đầu rà soát từ danh sách bên dưới.</p></div><Button variant="outline" size="sm" type="button" onClick={() => { const next = new URLSearchParams(params.toString()); next.delete("uploaded"); router.replace(`${pathname}?${next}`, { scroll: false }); }} aria-label="Ẩn thông báo tải lên">×</Button></div>}
    <div className={`flex flex-wrap gap-[8px] [&_button:not([data-slot=button])]:min-h-[36px] [&_button:not([data-slot=button])]:[border:1px_solid_#dce5f2] [&_button:not([data-slot=button])]:rounded-[20px] [&_button:not([data-slot=button])]:p-[6px_13px] [&_button:not([data-slot=button])]:[background:#fff] [&_button:not([data-slot=button])]:text-[#536881] [&_button:not([data-slot=button])]:text-[12px] [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button]):hover]:[border-color:#a9c5f4] [&_button:not([data-slot=button]):hover]:[background:#eaf2ff] [&_button:not([data-slot=button]):hover]:text-[#245bd6] [&_button:not([data-slot=button])[aria-pressed=true]]:[border-color:#a9c5f4] [&_button:not([data-slot=button])[aria-pressed=true]]:[background:#eaf2ff] [&_button:not([data-slot=button])[aria-pressed=true]]:text-[#245bd6] mt-5`}>
      {choices.map((choice) => <Button className="border border-border bg-white font-medium text-[#52647e] shadow-none hover:bg-[#f5f8fc] hover:text-[#263750] aria-pressed:border-[#c6d7f5] aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-accent-foreground" variant="ghost" size="sm" type="button" key={choice.label} aria-pressed={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel} onClick={() => onFilter(choice.filter)}>{choice.label}</Button>)}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); updateList({ page: 1, search: draft.trim() }); }}>
      <input aria-label="Tìm kiếm hợp đồng" placeholder="Tìm tên hợp đồng…" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <Button variant="default" size="sm" type="submit">Tìm kiếm</Button>
      {search && <Button variant="outline" size="sm" type="button" onClick={() => { setDraft(""); updateList({ page: 1, search: "" }); }}>Xóa tìm kiếm</Button>}
    </form>
    <div aria-live="polite">
      {query.isLoading ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"} aria-busy="true">Đang tải hợp đồng…</p> : query.error ? <div className={"text-[#a23a4d] text-[13px] leading-[1.7]"}><p>{isApiClientError(query.error) ? query.error.message : "Không thể tải hợp đồng."}</p><Button variant="outline" size="sm" type="button" onClick={() => query.refetch()}>Thử lại</Button></div> : !query.data?.items.length ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"}>Không có hợp đồng phù hợp. Thử nhóm khác hoặc xóa tìm kiếm.</p> : renderContracts(query.data.items, () => { if (query.data?.items.length === 1 && page > 1) updateList({ page: page - 1 }); })}
    </div>
    {query.data && <div className={"[&_button:not([data-slot=button])]:[border:1px_solid_#dce5f2] [&_button:not([data-slot=button])]:rounded-[9px] [&_button:not([data-slot=button])]:[background:white] [&_button:not([data-slot=button])]:p-[9px_14px] [&_button:not([data-slot=button])]:text-[#245bd6] [&_button:not([data-slot=button])]:text-[13px] [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button])]:cursor-pointer flex flex-wrap items-center justify-between gap-[12px] mt-[20px] text-[13px] text-[#708099] [&_>_div]:flex [&_>_div]:gap-[8px] [&_button:not([data-slot=button]):disabled]:opacity-[.45] [&_button:not([data-slot=button]):disabled]:cursor-default"}><span>Trang {page}/{pages} · {query.data.total} hợp đồng</span><div><Button variant="outline" size="sm" type="button" disabled={page <= 1 || query.isFetching} onClick={() => updateList({ page: page - 1 })}>Trước</Button><Button variant="outline" size="sm" type="button" disabled={page >= pages || query.isFetching} onClick={() => updateList({ page: page + 1 })}>Sau</Button></div></div>}
  </section>;
}
