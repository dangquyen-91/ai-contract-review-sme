"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractTypeLabels } from "@/config/contract-display";
import type { MyVerificationsController } from "@/hooks/expert-verification/use-my-verifications";

export function MyWorkFilters({
  controller,
}: {
  controller: MyVerificationsController;
}) {
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
    setSearch("");
    setFrom("");
    setTo("");
    setType("");
    setDateError("");
    resetFilters();
  }

  return (
    <div className="border-b border-[#e9edf3] px-5 py-4 sm:px-6">
      <form
        onSubmit={submit}
        role="search"
        aria-label="Tìm và lọc công việc"
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-[1.3fr_1fr_0.85fr_0.85fr]">
          <label className="col-span-2 min-w-0 space-y-2 text-xs font-medium text-[#65738a] sm:col-span-1">
            <span>Tìm hợp đồng</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#8a97aa]"
                aria-hidden="true"
              />
              <Input
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập tên hợp đồng…"
                className="h-11 border-[#dce3ed] bg-white pl-10 text-sm text-[#28364c] focus-visible:border-[#8caad6] focus-visible:ring-[#315eac]/15"
              />
            </span>
          </label>
          <label className="col-span-2 min-w-0 space-y-2 text-xs font-medium text-[#65738a] sm:col-span-1">
            <span>Loại hợp đồng</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#dce3ed] bg-white px-3 text-sm text-[#28364c] [color-scheme:light] focus-visible:outline-2 focus-visible:outline-[#315eac]"
            >
              <option value="">Tất cả loại</option>
              {Object.entries(contractTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
            <span>Ngày nhận từ</span>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-11 border-[#dce3ed] bg-white text-sm text-[#28364c] [color-scheme:light] focus-visible:ring-[#315eac]/15"
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? "work-date-error" : undefined}
            />
          </label>
          <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
            <span>Đến ngày</span>
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-11 border-[#dce3ed] bg-white text-sm text-[#28364c] [color-scheme:light] focus-visible:ring-[#315eac]/15"
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? "work-date-error" : undefined}
            />
          </label>
        </div>
        {dateError && (
          <p
            id="work-date-error"
            role="alert"
            className="m-0 text-ui-meta text-destructive"
          >
            {dateError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs leading-5 text-[#7a8698]">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            Lọc theo ngày nhận việc · Giờ Việt Nam (GMT+7)
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={reset}
              className="h-10 flex-1 text-xs text-[#315eac] sm:flex-none"
            >
              <X className="size-3.5" aria-hidden="true" />
              Xóa bộ lọc
            </Button>
            <Button
              size="sm"
              type="submit"
              className="h-10 flex-1 bg-[#315eac] text-xs text-white hover:bg-[#244d8b] sm:flex-none"
            >
              <Search className="size-3.5" aria-hidden="true" />
              Áp dụng bộ lọc
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
