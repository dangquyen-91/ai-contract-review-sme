"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { contractsApi } from "@/lib/api/contracts";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardContract } from "@/types/contracts";
import { MemberContractCards } from "./member-contract-cards";
import styles from "./member-insights.module.css";

export function MemberPriorityQueue({ orgId, role, onReview, onViewContracts, isReviewing }: {
  orgId: string;
  role: "staff" | "reviewer" | "manager";
  onReview: (contract: DashboardContract) => void;
  onViewContracts: (filter?: DashboardContractFilter) => void;
  isReviewing: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const groups: { label: string; filter: DashboardContractFilter }[] = role === "staff" ? [
    { label: "Chờ rà soát", filter: { status: "uploaded" } }, { label: "Đang xử lý", filter: { status: "processing" } },
  ] : [
    { label: "Rủi ro cao", filter: { riskLevel: "high", status: "reviewed" } },
    { label: role === "manager" ? "Chờ rà soát" : "Đã có kết quả", filter: { status: role === "manager" ? "uploaded" : "reviewed" } },
    { label: "Đang xử lý", filter: { status: "processing" } },
  ];
  const group = groups[selected];
  const query = useQuery({ queryKey: ["member-contracts", "priority", orgId, group.filter], queryFn: () => contractsApi.list({ ...group.filter, page: 1 }), retry: false, refetchInterval: (query) => query.state.data?.items.some((item) => item.status === "processing") ? 30_000 : false });
  return <section className={styles.queue} aria-labelledby="member-queue-title">
    <div className={styles.queueHeading}><div><h2 id="member-queue-title">{role === "staff" ? "Công việc cần xử lý" : "Hợp đồng cần chú ý"}</h2><p>Toàn tổ chức · tối đa 4 hợp đồng mới cập nhật trong nhóm</p></div><button type="button" onClick={() => onViewContracts(group.filter)}>Xem tất cả{query.data ? ` (${query.data.total})` : ""}</button></div>
    <div className={styles.filters}>{groups.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
    {query.isLoading ? <p className={styles.empty} aria-busy="true">Đang tải hợp đồng ưu tiên…</p> : query.error ? <div className={styles.error}><p>Không thể tải nhóm hợp đồng này. Các thống kê khác vẫn có thể sử dụng.</p><button type="button" onClick={() => query.refetch()}>Thử lại</button></div> : !query.data?.items.length ? <p className={styles.empty}>Chưa có hợp đồng trong nhóm này. Bạn có thể chọn nhóm khác.</p> : <MemberContractCards contracts={query.data.items.slice(0, 4)} onReview={onReview} isReviewing={isReviewing} />}
  </section>;
}
