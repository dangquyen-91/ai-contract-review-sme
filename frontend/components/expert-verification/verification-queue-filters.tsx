"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractTypeLabels } from "@/config/contract-display";
import type { VerificationQueueList } from "@/hooks/expert-verification/use-verification-queue-list";

export function VerificationQueueFilters({
  controller,
}: {
  controller: VerificationQueueList;
}) {
  const { filter, setFilter, reset } = controller;
  const [search, setSearch] = useState(filter.queueSearch);
  const hasFilters = Boolean(search || filter.queueSearch || filter.queueType || filter.queueSort !== "oldest");
  return (
    <div className="space-y-3 border-b border-[#e9edf3] px-5 py-4 sm:px-6">
      <form
        role="search"
        aria-label="Tìm và lọc yêu cầu xác minh"
        className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_minmax(160px,1fr)_minmax(150px,0.85fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void setFilter({ queueSearch: search.trim() });
        }}
      >
        <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
          <span>Tìm hợp đồng</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#8a97aa]" aria-hidden="true" />
            <Input
              value={search}
              maxLength={100}
              placeholder="Nhập tên hợp đồng…"
              className="h-11 border-[#dce3ed] bg-white pl-10 text-sm text-[#28364c] focus-visible:border-[#8caad6] focus-visible:ring-[#315eac]/15"
              onChange={(event) => setSearch(event.target.value)}
            />
          </span>
        </label>
        <label className="min-w-0 space-y-2 text-xs font-medium text-[#65738a]">
          <span>Loại hợp đồng</span>
          <select
            aria-label="Loại hợp đồng trong hàng đợi"
            value={filter.queueType}
            onChange={(event) => {
              void setFilter({ queueType: event.target.value });
            }}
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
          <span>Thứ tự gửi</span>
          <select
            aria-label="Thứ tự gửi"
            value={filter.queueSort}
            onChange={(event) => {
              void setFilter({
                queueSort: event.target.value as "oldest" | "newest",
              });
            }}
            className="h-11 w-full rounded-lg border border-[#dce3ed] bg-white px-3 text-sm text-[#28364c] [color-scheme:light] focus-visible:outline-2 focus-visible:outline-[#315eac]"
          >
            <option value="oldest">Cũ nhất trước</option>
            <option value="newest">Mới nhất trước</option>
          </select>
        </label>
        <Button type="submit" size="sm" className="h-11 bg-[#315eac] text-white hover:bg-[#244d8b]">
          <Search className="size-4" aria-hidden="true" />
          Tìm kiếm
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 flex items-start gap-2 text-xs leading-5 text-[#7a8698]">
          <SlidersHorizontal className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Tìm kiếm và bộ lọc áp dụng trên danh sách đã tải của nhóm đang chọn.
        </p>
        {hasFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-1 text-xs text-[#315eac]"
            onClick={() => {
              setSearch("");
              reset();
            }}
          >
            <X className="size-3.5" aria-hidden="true" />
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
