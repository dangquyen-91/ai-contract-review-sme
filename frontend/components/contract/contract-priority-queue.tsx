"use client";

import { Button } from "@/components/ui/button";

import { useState } from "react";
import { useContractsList } from "@/hooks/contracts/use-contracts";
import type { DashboardContractFilter } from "@/types/dashboard";
import type { DashboardContract } from "@/types/contracts";
import { ContractCards } from "@/components/contract/contract-cards";

export function ContractPriorityQueue({ orgId, role, onReview, onViewContracts, isReviewing }: {
  orgId: string;
  role: "staff" | "expert" | "manager";
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
  const query = useContractsList({ ...group.filter, page: 1 }, { scope: `${role}:${orgId}`, pollProcessing: true });
  return <section className={"min-w-[0] [border:1px_solid_#e1e8f2] rounded-[18px] [background:white] p-[22px]"} aria-labelledby="member-queue-title">
    <div className={"flex items-start justify-between gap-[16px] mb-[18px] [&_h2]:text-[18px] [&_h2]:font-bold [&_p]:mt-[6px] [&_p]:text-[#708099] [&_p]:text-[12px] [&_p]:leading-[1.6] [&_>_button:not([data-slot=button])]:[border:0] [&_>_button:not([data-slot=button])]:[background:transparent] [&_>_button:not([data-slot=button])]:text-[#245bd6] [&_>_button:not([data-slot=button])]:min-h-[36px] [&_>_button:not([data-slot=button])]:text-[12px] [&_>_button:not([data-slot=button])]:font-semibold [&_>_button:not([data-slot=button])]:whitespace-nowrap [&_>_button:not([data-slot=button])]:cursor-pointer max-[820px]:flex-wrap"}><div><h2 id="member-queue-title">{role === "staff" ? "Công việc cần xử lý" : "Hợp đồng cần chú ý"}</h2><p>Toàn tổ chức · tối đa 4 hợp đồng mới cập nhật trong nhóm</p></div><Button variant="default" size="sm" type="button" onClick={() => onViewContracts(group.filter)}>Xem tất cả{query.data ? ` (${query.data.total})` : ""}</Button></div>
    <div className={"flex flex-wrap gap-[8px] [&_button:not([data-slot=button])]:min-h-[36px] [&_button:not([data-slot=button])]:[border:1px_solid_#dce5f2] [&_button:not([data-slot=button])]:rounded-[20px] [&_button:not([data-slot=button])]:p-[6px_13px] [&_button:not([data-slot=button])]:[background:#fff] [&_button:not([data-slot=button])]:text-[#536881] [&_button:not([data-slot=button])]:text-[12px] [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button]):hover]:[border-color:#a9c5f4] [&_button:not([data-slot=button]):hover]:[background:#eaf2ff] [&_button:not([data-slot=button]):hover]:text-[#245bd6] [&_button:not([data-slot=button])[aria-pressed=true]]:[border-color:#a9c5f4] [&_button:not([data-slot=button])[aria-pressed=true]]:[background:#eaf2ff] [&_button:not([data-slot=button])[aria-pressed=true]]:text-[#245bd6]"}>{groups.map((item, index) => <Button className="aria-pressed:bg-primary-hover aria-pressed:ring-2 aria-pressed:ring-primary/30 aria-pressed:ring-offset-2" variant="default" size="sm" key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</Button>)}</div>
    {query.isLoading ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"} aria-busy="true">Đang tải hợp đồng ưu tiên…</p> : query.error ? <div className={"text-[#a23a4d] text-[13px] leading-[1.7]"}><p>Không thể tải nhóm hợp đồng này. Các thống kê khác vẫn có thể sử dụng.</p><Button variant="outline" size="sm" type="button" onClick={() => query.refetch()}>Thử lại</Button></div> : !query.data?.items.length ? <p className={"grid min-h-[220px] content-center text-[#708099] text-[13px] leading-[1.7] text-center"}>Chưa có hợp đồng trong nhóm này. Bạn có thể chọn nhóm khác.</p> : <ContractCards contracts={query.data.items.slice(0, 4)} onReview={onReview} isReviewing={isReviewing} />}
  </section>;
}
