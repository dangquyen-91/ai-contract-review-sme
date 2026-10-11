"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import { isApiClientError } from "@/lib/api/client";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardContract } from "@/types/contracts";
import styles from "./member-insights.module.css";

export function MemberContractsView({ orgId, filter, reviewerMode, onFilter, renderContracts }: {
  orgId: string;
  filter: DashboardContractFilter;
  reviewerMode: boolean;
  onFilter: (filter?: DashboardContractFilter) => void;
  renderContracts: (contracts: DashboardContract[]) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["member-contracts", orgId, filter, page, search], queryFn: () => contractsApi.list({ ...filter, page, search: search || undefined }), retry: false });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 10));
  const choices: { label: string; filter: DashboardContractFilter }[] = [
    { label: "Tất cả", filter: {} },
    ...(reviewerMode ? [{ label: "Rủi ro cao", filter: { riskLevel: "high" } as DashboardContractFilter }, { label: "Đã có kết quả", filter: { status: "reviewed" } as DashboardContractFilter }] : [{ label: "Chờ rà soát", filter: { status: "uploaded" } as DashboardContractFilter }]),
    { label: "AI đang xử lý", filter: { status: "processing" } },
  ];
  const statusNames = { uploaded: "Chờ rà soát", processing: "AI đang xử lý", reviewed: "Đã rà soát", archived: "Lưu trữ" };
  const riskNames = { high: "Rủi ro cao", medium: "Rủi ro trung bình", low: "Rủi ro thấp", none: "Chưa đánh giá" };
  return <section className={styles.listPage} aria-labelledby="member-contracts-heading">
    <h1 id="member-contracts-heading" className="text-[28px] font-bold tracking-[-.03em]">Hợp đồng của tổ chức</h1>
    <p className={styles.subtitle}>{filter.status ? statusNames[filter.status] : filter.riskLevel ? riskNames[filter.riskLevel] : "Tất cả hợp đồng"} · {query.data ? `${query.data.total} kết quả` : "Đang tải…"}</p>
    <div className={`${styles.filters} mt-5`}>
      {choices.map((choice) => <button type="button" key={choice.label} aria-pressed={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel} onClick={() => onFilter(choice.filter)}>{choice.label}</button>)}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(draft.trim()); }}>
      <input aria-label="Tìm kiếm hợp đồng" placeholder="Tìm tên hợp đồng…" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="submit">Tìm kiếm</button>
      {search && <button type="button" onClick={() => { setDraft(""); setSearch(""); setPage(1); }}>Xóa tìm kiếm</button>}
    </form>
    <div aria-live="polite">
      {query.isLoading ? <p className={styles.empty} aria-busy="true">Đang tải hợp đồng…</p> : query.error ? <div className={styles.error}><p>{isApiClientError(query.error) ? query.error.message : "Không thể tải hợp đồng."}</p><button type="button" onClick={() => query.refetch()}>Thử lại</button></div> : !query.data?.items.length ? <p className={styles.empty}>Không có hợp đồng phù hợp. Thử nhóm khác hoặc xóa tìm kiếm.</p> : renderContracts(query.data.items)}
    </div>
    {query.data && <div className={styles.pagination}><span>Trang {page}/{pages} · {query.data.total} hợp đồng</span><div><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>Trước</button><button type="button" disabled={page >= pages || query.isFetching} onClick={() => setPage(page + 1)}>Sau</button></div></div>}
  </section>;
}
