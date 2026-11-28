"use client";

import { useEffect, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLog } from "@/hooks/admin/use-audit-log";
import { usePaginationPage } from "@/hooks/shared/use-pagination-page";
import { actorLabel, auditActionLabel, auditGroupLabels, auditTone } from "@/lib/admin/audit-labels";
import type { AuditEvent, AuditFilters, AuditGroup } from "@/types/admin-operations";
import { NativeSelect, nativeFieldClass } from "@/components/ui/native-select";
import { ListPagination } from "@/components/management/list-pagination";
import { formatVietnamDateTime } from "@/lib/format/date-time";
import styles from "@/styles/user_management/user-management.module.css";
import { AuditEventDialog } from "./audit-event-dialog";

const PAGE_SIZE = 20;
const groups = Object.entries(auditGroupLabels) as [AuditGroup, string][];
const groupParser = parseAsStringLiteral(groups.map(([value]) => value));
const dateClass = `${nativeFieldClass} w-[9.5rem]`;
const toneClass = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-300",
  danger: "bg-red-50 text-red-700 ring-red-200",
} as const;

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${toneClass[auditTone(action)]}`}>
      {auditActionLabel(action)}
    </span>
  );
}

const targetText = (event: AuditEvent) => event.target.label ?? (event.target.id ? `#${event.target.id}` : "—");

export function AuditLogViewer() {
  const [page, setPage] = usePaginationPage();
  const [group, setGroup] = useQueryState("group", groupParser.withOptions({ history: "push" }));
  const [searchInput, setSearchInput] = useState("");
  const [rest, setRest] = useState<Omit<AuditFilters, "group">>({ search: "", from: "", to: "" });
  const filters: AuditFilters = { ...rest, group: group ?? "" };
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const list = useAuditLog(page, PAGE_SIZE, filters);
  const hasFilters = Boolean(filters.group || filters.search || filters.from || filters.to);
  const applyFilters = ({ group: nextGroup, ...change }: Partial<AuditFilters>) => {
    if (nextGroup !== undefined) void setGroup(nextGroup || null);
    setRest((current) => ({ ...current, ...change }));
    void setPage(1);
  };
  const clearFilters = () => {
    setSearchInput("");
    applyFilters({ group: "", search: "", from: "", to: "" });
  };
  const range = filters.from || filters.to ? `${filters.from || "…"} → ${filters.to || "…"}` : "";
  const summary = [filters.search && `“${filters.search}”`, filters.group && auditGroupLabels[filters.group], range].filter(Boolean);

  useEffect(() => {
    if (list.data && page > list.data.totalPages) void setPage(list.data.totalPages);
  }, [list.data, page, setPage]);

  return (
    <section className={styles.workspace} aria-label="Nhật ký quản trị">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon}><ShieldCheck size={20} aria-hidden="true" /></span>
          <div>
            <h2>
              Sự kiện{" "}
              <span className={styles.count}>{list.data ? list.data.total.toLocaleString("vi-VN") : "—"}</span>
            </h2>
            <p>Ai đã làm gì, với đối tượng nào và lúc nào. Nhật ký chỉ được xem, không thể sửa hoặc xóa.</p>
          </div>
        </div>
      </header>
      <div className={styles.panel}>
        <form
          className={styles.toolbar}
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters({ search: searchInput.trim() });
          }}
        >
          <div className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <Input
              aria-label="Tìm theo người thực hiện hoặc đối tượng"
              placeholder="Tìm theo người thực hiện, email hoặc đối tượng…"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm" variant="ghost" className={styles.searchButton}>Tìm kiếm</Button>
          </div>
          <div className={`${styles.filters} flex-wrap`}>
            <NativeSelect
              aria-label="Lọc nhóm thao tác"
              value={filters.group}
              onChange={(event) => applyFilters({ group: event.target.value as AuditFilters["group"] })}
            >
              <option value="">Mọi nhóm thao tác</option>
              {groups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
            <input
              type="date"
              aria-label="Từ ngày"
              className={dateClass}
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => applyFilters({ from: event.target.value })}
            />
            <input
              type="date"
              aria-label="Đến ngày"
              className={dateClass}
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => applyFilters({ to: event.target.value })}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Tải lại nhật ký"
              title="Tải lại nhật ký"
              className={styles.refresh}
              disabled={list.isFetching}
              onClick={() => void list.refetch()}
            >
              <RefreshCw className={list.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
            </Button>
          </div>
        </form>
        {hasFilters && (
          <div className={styles.filterSummary}>
            <span>Đang lọc: {summary.join(" · ")}</span>
            <Button size="xs" variant="ghost" onClick={clearFilters}><X aria-hidden="true" />Xóa bộ lọc</Button>
          </div>
        )}
        {list.isPending ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Đang tải nhật ký…</p>
        ) : list.isError ? (
          <div role="alert" className="grid justify-items-center gap-3 px-6 py-12 text-center text-sm">
            <p>{list.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>Thử lại</Button>
          </div>
        ) : (
          <div aria-busy={list.isFetching}>
            <Table className="min-w-205">
              <caption className="sr-only">Thời gian, người thực hiện, thao tác và đối tượng của từng sự kiện</caption>
              <TableHeader>
                <TableRow>
                  {["Thời gian", "Người thực hiện", "Thao tác", "Đối tượng", "Chi tiết"].map((label) => (
                    <TableHead scope="col" key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatVietnamDateTime(event.createdAt, { timeStyle: "medium" })}</TableCell>
                    <TableCell className="max-w-55 whitespace-normal">
                      <span className="block font-medium">{actorLabel(event.actor)}</span>
                      {event.actor.email && <span className="text-xs text-slate-500">{event.actor.email}</span>}
                    </TableCell>
                    <TableCell><ActionBadge action={event.action} /></TableCell>
                    <TableCell className="max-w-65 whitespace-normal">
                      <span className="block wrap-break-word">{targetText(event)}</span>
                      {event.organization && <span className="text-xs text-slate-500">{event.organization.name}</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelected(event)}>Xem</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {list.data.items.length === 0 && (
              <div role="status" className={styles.empty}>
                <h3>{hasFilters ? "Không có sự kiện phù hợp" : "Chưa có sự kiện nào được ghi."}</h3>
                {hasFilters && <Button size="sm" variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>}
              </div>
            )}
            <ListPagination
              page={page}
              total={list.data.total}
              limit={list.data.limit}
              totalPages={list.data.totalPages}
              busy={list.isFetching}
              unit="sự kiện"
              label="Phân trang nhật ký"
              onPageChange={(next) => void setPage(next)}
            />
          </div>
        )}
      </div>
      <AuditEventDialog event={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
