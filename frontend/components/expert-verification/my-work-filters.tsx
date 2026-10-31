"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractTypeLabels } from "@/config/contract-display";
import type { MyVerificationsController } from "@/hooks/expert-verification/use-my-verifications";
import type { ExpertWorkStatus } from "@/types/expert-work";

const statuses: { value: ExpertWorkStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "approved", label: "Đã hoàn tất" },
  { value: "returned", label: "Đã trả lại" },
];

export function MyWorkFilters({ controller }: { controller: MyVerificationsController }) {
  const { filter, applyFilters, resetFilters } = controller;
  const [search, setSearch] = useState(filter.search);
  const [from, setFrom] = useState(filter.from);
  const [to, setTo] = useState(filter.to);
  const [type, setType] = useState(filter.type);
  const [dateError, setDateError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from && to && from > to) {
      setDateError("Ngày kết thúc cần bằng hoặc sau ngày bắt đầu.");
      return;
    }
    setDateError("");
    applyFilters({ search: search.trim(), from, to, type });
  }

  function reset() {
    setSearch(""); setFrom(""); setTo(""); setType(""); setDateError("");
    resetFilters();
  }

  return (
    <div className="space-y-4 border-b border-border p-4 sm:p-5">
      <div role="group" aria-label="Trạng thái công việc" className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button key={status.value} size="sm" variant={filter.status === status.value ? "secondary" : "ghost"}
            aria-pressed={filter.status === status.value} onClick={() => applyFilters({ status: status.value })}>
            {status.label}
          </Button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-ui-meta font-medium">
            <span>Tìm hợp đồng</span>
            <Input value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên hợp đồng" />
          </label>
          <label className="space-y-1.5 text-ui-meta font-medium">
            <span>Loại hợp đồng</span>
            <select value={type} onChange={(event) => setType(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-card-foreground [color-scheme:light] focus-visible:outline-2 focus-visible:outline-primary">
              <option value="">Tất cả loại</option>
              {Object.entries(contractTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-ui-meta font-medium">
            <span>Ngày nhận từ</span>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="[color-scheme:light]" aria-describedby={dateError ? "work-date-error" : undefined} />
          </label>
          <label className="space-y-1.5 text-ui-meta font-medium">
            <span>Đến ngày</span>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="[color-scheme:light]" aria-describedby={dateError ? "work-date-error" : undefined} />
          </label>
        </div>
        {dateError && <p id="work-date-error" role="alert" className="m-0 text-ui-meta text-destructive">{dateError}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" type="submit" variant="outline"><Search aria-hidden="true" />Áp dụng bộ lọc</Button>
          <Button size="sm" type="button" variant="ghost" onClick={reset}>Xóa bộ lọc</Button>
          <span className="text-ui-meta font-normal text-muted-foreground">Ngày nhận theo giờ Việt Nam (GMT+7).</span>
        </div>
      </form>
    </div>
  );
}
