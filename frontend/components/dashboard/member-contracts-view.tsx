"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useContractsList } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardContract } from "@/types/contracts";
import { paginationPageParser } from "@/hooks/use-pagination-page";
import styles from "./member-insights.module.css";

const listSearchParams = {
  page: paginationPageParser,
  search: parseAsString.withDefault(""),
};


export function MemberContractsView({ orgId, filter, reviewerMode, managerMode = false, onFilter, renderContracts }: {
  orgId: string;
  filter: DashboardContractFilter;
  reviewerMode: boolean;
  managerMode?: boolean;
  onFilter: (filter?: DashboardContractFilter) => void;
  renderContracts: (contracts: DashboardContract[]) => ReactNode;
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
  const query = useContractsList({ ...filter, page, search: search || undefined }, { queryKey: ["member-contracts", orgId, filter, page, search], pollProcessing: true });
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
  return <section className={styles.listPage} aria-labelledby="member-contracts-heading">
    <h1 id="member-contracts-heading" className="text-[28px] font-bold tracking-[-.03em]">Hợp đồng của tổ chức</h1>
    <p className={styles.subtitle}>{[filter.status && statusNames[filter.status], filter.riskLevel && riskNames[filter.riskLevel]].filter(Boolean).join(" · ") || "Tất cả hợp đồng"} · {query.data ? `${query.data.total} kết quả` : query.error ? "Chưa tải được dữ liệu" : "Đang tải…"}</p>
    {uploaded && <div className={styles.uploadSuccess} role="status"><div><strong>Hợp đồng vừa tải lên</strong><p>{uploaded.title} · Đã lưu tài liệu. Bạn có thể bắt đầu rà soát từ danh sách bên dưới.</p></div><button type="button" onClick={() => { const next = new URLSearchParams(params.toString()); next.delete("uploaded"); router.replace(`${pathname}?${next}`, { scroll: false }); }} aria-label="Ẩn thông báo tải lên">×</button></div>}
    <div className={`${styles.filters} mt-5`}>
      {choices.map((choice) => <button type="button" key={choice.label} aria-pressed={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel} onClick={() => onFilter(choice.filter)}>{choice.label}</button>)}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); updateList({ page: 1, search: draft.trim() }); }}>
      <input aria-label="Tìm kiếm hợp đồng" placeholder="Tìm tên hợp đồng…" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="submit">Tìm kiếm</button>
      {search && <button type="button" onClick={() => { setDraft(""); updateList({ page: 1, search: "" }); }}>Xóa tìm kiếm</button>}
    </form>
    <div aria-live="polite">
      {query.isLoading ? <p className={styles.empty} aria-busy="true">Đang tải hợp đồng…</p> : query.error ? <div className={styles.error}><p>{isApiClientError(query.error) ? query.error.message : "Không thể tải hợp đồng."}</p><button type="button" onClick={() => query.refetch()}>Thử lại</button></div> : !query.data?.items.length ? <p className={styles.empty}>Không có hợp đồng phù hợp. Thử nhóm khác hoặc xóa tìm kiếm.</p> : renderContracts(query.data.items)}
    </div>
    {query.data && <div className={styles.pagination}><span>Trang {page}/{pages} · {query.data.total} hợp đồng</span><div><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => updateList({ page: page - 1 })}>Trước</button><button type="button" disabled={page >= pages || query.isFetching} onClick={() => updateList({ page: page + 1 })}>Sau</button></div></div>}
  </section>;
}
