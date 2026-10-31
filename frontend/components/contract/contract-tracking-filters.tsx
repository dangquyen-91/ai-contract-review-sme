"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContractTrackingController } from "@/hooks/contracts/use-contract-tracking-list";
import type { DashboardContractFilter } from "@/types/dashboard";
import { ContractVerificationTabs } from "./contract-verification-tabs";

const choices: { label: string; filter: DashboardContractFilter }[] = [
  { label: "Tất cả", filter: {} },
  { label: "Chờ rà soát", filter: { status: "uploaded" } },
  { label: "AI đang xử lý", filter: { status: "processing" } },
  { label: "Có kết quả AI", filter: { status: "reviewed" } },
  { label: "Rủi ro cao", filter: { riskLevel: "high" } },
];

function SearchForm({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(search);
  return (
    <form role="search" className="flex w-full flex-wrap gap-2 sm:w-auto" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()); }}>
      <label className="min-w-0 basis-full sm:w-64 sm:flex-1 sm:basis-auto">
        <span className="sr-only">Tìm tên hợp đồng</span>
        <Input type="search" value={draft} maxLength={300} placeholder="Tìm tên hợp đồng…" onChange={(event) => setDraft(event.target.value)} />
      </label>
      <Button type="submit" variant="outline" size="sm"><Search aria-hidden="true" />Tìm kiếm</Button>
      {search && <Button type="button" variant="ghost" size="sm" onClick={() => onSearch("")}>Xóa tìm kiếm</Button>}
    </form>
  );
}

export function ContractTrackingFilters({ controller }: { controller: ContractTrackingController }) {
  const { state, filter, total, setSearch, setFilter, setVerification } = controller;
  return (
    <div className="min-w-0 border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <p role="status" className="m-0 text-ui text-muted-foreground">{controller.query.isPending ? "Đang tải…" : `${total} hợp đồng`}</p>
        <SearchForm key={state.search} search={state.search} onSearch={(value) => { void setSearch(value); }} />
      </div>
      <ContractVerificationTabs value={filter.verificationStatus ?? ""} onChange={(value) => { void setVerification(value); }} />
      <div role="group" aria-label="Trạng thái AI" className="flex flex-wrap items-center gap-1 bg-muted/20 px-4 py-3 sm:px-5">
        <span className="mr-2 text-ui-meta text-muted-foreground">Kết quả AI</span>
        {choices.map((choice) => (
          <Button key={choice.label} variant={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel ? "secondary" : "ghost"}
            size="sm" aria-pressed={filter.status === choice.filter.status && filter.riskLevel === choice.filter.riskLevel}
            onClick={() => { void setFilter({ ...choice.filter, verificationStatus: filter.verificationStatus }); }}>
            {choice.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
