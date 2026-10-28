"use client";

import { useId, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { legalSourceStatuses, legalSourceTypes } from "@/config/legal-source-display";
import type { SourceFilters } from "@/lib/legal-sources/legal-source-filtering";

const field = "h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-ui font-normal leading-normal text-card-foreground [color-scheme:light] outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";
const label = "grid min-w-0 content-start gap-2 text-ui-meta font-medium leading-normal text-muted-foreground";

export function LegalSourceFilters({ search, type, filters, hasFilters, dateError, onSearchChange, onTypeChange, onFilterChange, onClear }: {
  search: string; type: string; filters: SourceFilters; hasFilters: boolean; dateError: boolean;
  onSearchChange: (value: string) => void; onTypeChange: (value: string) => void;
  onFilterChange: (key: keyof SourceFilters, value: string) => void; onClear: () => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const advancedCount = [filters.issuingBody, filters.issuedFrom, filters.issuedTo].filter(Boolean).length;
  return <div className="space-y-4 p-5">
    <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem]">
      <div className={`${label} sm:col-span-2 xl:col-span-1`}>
        <label htmlFor={`${id}-search`}>Tìm nguồn tham chiếu</label>
        <div className="flex h-12 min-w-0 items-center gap-2 rounded-lg border border-input bg-card pl-3 pr-1 text-card-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input ref={inputRef} id={`${id}-search`} type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Tên, số hiệu, mã nguồn, cơ quan ban hành…" className="h-full w-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-ui font-normal leading-normal text-card-foreground placeholder:text-muted-foreground shadow-none outline-none ring-0 [color-scheme:light] focus:outline-none! focus:ring-0 focus-visible:outline-none! [&::-webkit-search-cancel-button]:appearance-none" />
          {search && <Button variant="ghost" size="icon-sm" className="size-10 shrink-0" aria-label="Xóa từ khóa tìm kiếm" onClick={() => { onSearchChange(""); inputRef.current?.focus(); }}><X aria-hidden="true" /></Button>}
        </div>
      </div>
      <label className={label}>Loại nguồn<select value={type} onChange={(event) => onTypeChange(event.target.value)} className={field}><option value="all">Tất cả loại nguồn</option>{Object.entries(legalSourceTypes).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
      <label className={label}>Hiệu lực<select value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)} className={field}><option value="all">Tất cả hiệu lực</option>{Object.entries(legalSourceStatuses).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" className="h-11 sm:h-9" aria-expanded={advanced} aria-controls={`${id}-advanced`} onClick={() => setAdvanced(!advanced)}><SlidersHorizontal aria-hidden="true" />Bộ lọc nâng cao{advancedCount > 0 && <span className="rounded bg-accent px-1.5">{advancedCount}</span>}</Button>
      {hasFilters && <Button variant="ghost" size="sm" className="h-11 sm:h-9" onClick={onClear}><RotateCcw aria-hidden="true" />Xóa bộ lọc</Button>}
      <p className="text-ui-meta text-muted-foreground">Hỗ trợ tìm kiếm không dấu.</p>
    </div>
    <div id={`${id}-advanced`} hidden={!advanced} className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className={label}>Cơ quan ban hành<input className={field} value={filters.issuingBody} placeholder="Ví dụ: Quốc hội" onChange={(event) => onFilterChange("issuingBody", event.target.value)} /></label>
        <label className={label}>Ban hành từ ngày<input type="date" className={field} value={filters.issuedFrom} max={filters.issuedTo || undefined} aria-invalid={dateError} aria-describedby={dateError ? `${id}-date-error` : undefined} onChange={(event) => onFilterChange("issuedFrom", event.target.value)} /></label>
        <label className={label}>Đến ngày<input type="date" className={field} value={filters.issuedTo} min={filters.issuedFrom || undefined} aria-invalid={dateError} aria-describedby={dateError ? `${id}-date-error` : undefined} onChange={(event) => onFilterChange("issuedTo", event.target.value)} /></label>
      </div>
    </div>
    {dateError && <p id={`${id}-date-error`} role="alert" className="text-ui text-destructive">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
  </div>;
}
