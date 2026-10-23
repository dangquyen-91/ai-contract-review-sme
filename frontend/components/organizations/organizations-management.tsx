"use client";

import { useEffect, useState } from "react";
import { Building2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useOrganizationsList } from "@/hooks/use-organizations";
import { usePaginationPage } from "@/hooks/use-pagination-page";
import type { Organization } from "@/types/organization";
import { useIndustryOptions } from "./organization-industry-dialog";
import styles from "@/styles/user_management/user-management.module.css";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function OrganizationsManagement() {
  const [page, setPage] = usePaginationPage();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const list = useOrganizationsList(page, 20, { search, industry });
  const allOrganizations = useOrganizationsList(1);
  const industries = useIndustryOptions();
  const [selected, setSelected] = useState<Organization | null>(null);
  const hasFilters = Boolean(search || industry);
  const clearFilters = () => { setSearchInput(""); setSearch(""); setIndustry(""); void setPage(1); };
  const industryLabel = (code: string) => industries.find((option) => option.code === code)?.name ?? code;

  useEffect(() => {
    if (list.data && page > list.data.totalPages) void setPage(list.data.totalPages);
  }, [list.data, page, setPage]);

  return (
    <section className={styles.workspace} aria-label="Danh sách tổ chức">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon}><Building2 size={20} aria-hidden="true" /></span>
          <div>
            <h2>Danh sách tổ chức <span className={styles.count}>{allOrganizations.data ? allOrganizations.data.total.toLocaleString("vi-VN") : "—"}</span></h2>
            <p>Quản lý thông tin tổ chức trên hệ thống.</p>
          </div>
        </div>
      </header>
      <div className={styles.panel}>
        <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); void setPage(1); }}>
          <div className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <Input aria-label="Tìm theo tên hoặc mã số thuế" placeholder="Tìm theo tên hoặc mã số thuế…" maxLength={100} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            <Button type="submit" size="sm" variant="ghost" className={styles.searchButton}>Tìm kiếm</Button>
          </div>
          <div className={styles.filters}>
            <select aria-label="Lọc ngành nghề" className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30" value={industry} onChange={(event) => { setIndustry(event.target.value); void setPage(1); }}>
              <option value="">Tất cả ngành nghề</option>
              {industries.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
            </select>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Tải lại danh sách" title="Tải lại danh sách" className={styles.refresh} disabled={list.isFetching || allOrganizations.isFetching} onClick={() => { void list.refetch(); void allOrganizations.refetch(); }}><RefreshCw className={list.isFetching || allOrganizations.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" /></Button>
          </div>
        </form>
        {hasFilters && <div className={styles.filterSummary}><span>Đang lọc{search ? `: “${search}”` : ""}{industry ? ` · ${industryLabel(industry)}` : ""}</span><Button size="xs" variant="ghost" onClick={clearFilters}><X aria-hidden="true" />Xóa bộ lọc</Button></div>}
        {list.isPending ? (
          <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Đang tải danh sách tổ chức…</p>
        ) : list.isError ? (
          <div role="alert" className="grid justify-items-center gap-3 px-6 py-12 text-center text-sm">
            <p>{list.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>Thử lại</Button>
            {page > 1 && <Button variant="ghost" size="sm" onClick={() => void setPage(1)}>Về trang đầu</Button>}
          </div>
        ) : (
          <div aria-busy={list.isFetching}>
            <Table className="min-w-[750px]">
              <caption className="sr-only">Tên, mã số thuế, địa chỉ, ngành nghề và ngày tạo tổ chức</caption>
              <TableHeader>
                <TableRow>{["Tổ chức", "Mã số thuế", "Địa chỉ", "Ngành nghề", "Ngày tạo", "Thao tác"].map((label) => <TableHead scope="col" key={label}>{label}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium">{organization.name}</TableCell>
                    <TableCell>{organization.taxCode ?? "—"}</TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal">{organization.address ?? "—"}</TableCell>
                    <TableCell>{organization.industry ? industryLabel(organization.industry) : "—"}</TableCell>
                    <TableCell>{formatDate(organization.createdAt)}</TableCell>
                    <TableCell><Button variant="outline" size="sm" onClick={() => setSelected(organization)}>Xem chi tiết</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {list.data.items.length === 0 && <div role="status" className={styles.empty}><h3>{hasFilters ? "Không tìm thấy tổ chức" : "Chưa có tổ chức nào."}</h3>{hasFilters && <><p>Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.</p><Button size="sm" variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></>}</div>}
            <footer className={styles.footer}>
              <p role="status">{list.data.total > 0 ? <>Hiển thị <strong>{((page - 1) * list.data.limit + 1).toLocaleString("vi-VN")}–{Math.min(page * list.data.limit, list.data.total).toLocaleString("vi-VN")}</strong> trong <strong>{list.data.total.toLocaleString("vi-VN")}</strong> tổ chức</> : "0 tổ chức"}</p>
              <nav aria-label="Phân trang tổ chức" className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || list.isFetching} onClick={() => void setPage(page - 1)}>Trước</Button>
                <span>Trang {page} / {list.data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= list.data.totalPages || list.isFetching} onClick={() => void setPage(page + 1)}>Sau</Button>
              </nav>
            </footer>
          </div>
        )}
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogTitle>{selected?.name ?? "Thông tin tổ chức"}</DialogTitle>
          <DialogDescription>Thông tin chi tiết của tổ chức trên hệ thống.</DialogDescription>
          {selected && <dl className="grid gap-4 text-sm">
            {[
              ["Mã tổ chức", selected.id],
              ["Mã số thuế", selected.taxCode ?? "—"],
              ["Địa chỉ", selected.address ?? "—"],
              ["Ngành nghề", selected.industry ? industryLabel(selected.industry) : "—"],
              ["Ngày tạo", formatDate(selected.createdAt)],
              ["Cập nhật lần cuối", formatDate(selected.updatedAt)],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
          </dl>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
