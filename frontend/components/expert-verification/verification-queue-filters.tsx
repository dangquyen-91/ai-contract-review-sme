"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractTypeLabels } from "@/config/contract-display";
import type { VerificationQueueList } from "@/hooks/expert-verification/use-verification-queue-list";

export function VerificationQueueFilters({
  controller,
}: {
  controller: VerificationQueueList;
}) {
  const { filter, setFilter, status, setStatus, reset } = controller;
  const [search, setSearch] = useState(filter.queueSearch);
  return (
    <div className="space-y-4 border-b border-border p-4">
      <div
        role="group"
        aria-label="Lọc yêu cầu xác minh"
        className="flex flex-wrap gap-2"
      >
        {(
          [
            { value: "all", label: "Tất cả" },
            { value: "requested", label: "Chờ tiếp nhận" },
            { value: "in_progress", label: "Tôi đang xử lý" },
          ] as const
        ).map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={item.value === status ? "secondary" : "ghost"}
            aria-pressed={item.value === status}
            onClick={() => {
              void setStatus(item.value);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <form
        role="search"
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void setFilter({ queueSearch: search.trim() });
        }}
      >
        <label className="min-w-0 flex-1 basis-56 space-y-1.5 text-ui-meta font-medium">
          <span>Tìm hợp đồng đã tải</span>
          <Input
            value={search}
            maxLength={100}
            placeholder="Tên hợp đồng…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="min-w-0 flex-1 basis-40 space-y-1.5 text-ui-meta font-medium">
          <span>Loại hợp đồng</span>
          <select
            aria-label="Loại hợp đồng trong hàng đợi"
            value={filter.queueType}
            onChange={(event) => {
              void setFilter({ queueType: event.target.value });
            }}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-ui text-card-foreground [color-scheme:light] focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">Tất cả loại</option>
            {Object.entries(contractTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 basis-40 space-y-1.5 text-ui-meta font-medium">
          <span>Thứ tự gửi</span>
          <select
            aria-label="Thứ tự gửi"
            value={filter.queueSort}
            onChange={(event) => {
              void setFilter({
                queueSort: event.target.value as "oldest" | "newest",
              });
            }}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-ui text-card-foreground [color-scheme:light] focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="oldest">Cũ nhất trước</option>
            <option value="newest">Mới nhất trước</option>
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline">
          Tìm kiếm
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setSearch("");
            reset();
          }}
        >
          Xóa bộ lọc
        </Button>
      </form>
      <p className="m-0 text-ui-caption text-muted-foreground">
        Tìm kiếm, loại hợp đồng và thứ tự chỉ áp dụng trong tối đa 100 yêu cầu
        đã tải của nhóm đang chọn.
      </p>
    </div>
  );
}
