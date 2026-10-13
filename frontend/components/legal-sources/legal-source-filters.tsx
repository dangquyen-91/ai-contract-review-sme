"use client";

import { Icon } from "@/components/ui/icon";

export function LegalSourceFilters({ search, type, onSearchChange, onTypeChange }: { search: string; type: string; onSearchChange: (value: string) => void; onTypeChange: (value: string) => void }) {
  return (<div className="flex flex-wrap items-end gap-4 border-b border-slate-200 p-5">
          <label className="grid min-w-0 flex-1 gap-2 text-xs font-medium text-slate-600">
            <span>Tìm nguồn tham chiếu</span>
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-blue-600">
              <Icon name="search" className="size-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  onSearchChange(event.target.value);
                }}
                placeholder="Tên văn bản, mã trích dẫn, cơ quan ban hành…"
                className="w-full min-w-0 bg-transparent text-sm font-normal outline-none"
              />
            </span>
          </label>
          <label className="grid gap-2 text-xs font-medium text-slate-600">
            <span>Loại nguồn</span>
            <select
              value={type}
              onChange={(event) => {
                onTypeChange(event.target.value);
              }}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal focus-visible:outline-blue-600"
            >
              <option value="all">Tất cả loại nguồn</option>
              <option value="law">Văn bản pháp luật</option>
              <option value="standard_template">Mẫu hợp đồng</option>
            </select>
          </label>
        </div>);
}
