"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Check, Mail, Pencil, Plus, RefreshCw, Search, LockKeyhole, LockKeyholeOpen, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { userManagementPageSize } from "@/config/user-management";
import { getUserRoleLabel, userRoleOptions } from "@/lib/user-role";
import { useManagedUsers, useSetManagedUserStatus } from "@/hooks/use-user-management";
import type { ManagedUser, ManagedUserRole, UserListParams } from "@/types/user-management";
import { UserEditor } from "./user-editor";
import styles from "@/styles/user_management/user-management.module.css";
const selectClass = "h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join("").toLocaleUpperCase("vi-VN") || "?";
}

export function UserManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ManagedUserRole | "">("");
  const [status, setStatus] = useState<UserListParams["status"]>("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<ManagedUser | "new" | null>(null);
  const [statusTarget, setStatusTarget] = useState<ManagedUser | null>(null);
  const list = useManagedUsers({ search, role, status, page, limit: userManagementPageSize });
  const allUsers = useManagedUsers({ search: "", role: "", status: "", page: 1, limit: userManagementPageSize });
  const statusMutation = useSetManagedUserStatus();
  const hasFilters = Boolean(search || role || status);
  const clearFilters = () => { setSearchInput(""); setSearch(""); setRole(""); setStatus(""); setPage(1); };
  const total = list.data?.total ?? 0;
  const pageSize = list.data?.limit ?? userManagementPageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return <section className={styles.workspace} aria-label="Quản lý người dùng">
    <header className={styles.heading}>
      <div className={styles.headingCopy}>
        <span className={styles.headingIcon}><Users size={20} aria-hidden="true" /></span>
        <div><h2>Danh sách người dùng <span className={styles.count}>{allUsers.data ? allUsers.data.total.toLocaleString("vi-VN") : "—"}</span></h2>
          <p>Quản lý tài khoản, vai trò và quyền truy cập hệ thống.</p></div>
      </div>
      <Button size="sm" className={styles.addButton} onClick={() => setEditor("new")}><Plus aria-hidden="true" />Thêm người dùng</Button>
    </header>
    <div className={styles.panel}>
      <form onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }} className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <Input aria-label="Tìm theo tên hoặc email" placeholder="Tìm theo tên hoặc email…" maxLength={100} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <Button type="submit" size="sm" variant="ghost" className={styles.searchButton}>Tìm kiếm</Button>
        </div>
        <div className={styles.filters}>
          <select aria-label="Lọc vai trò" className={selectClass} value={role} onChange={(event) => { setRole(event.target.value as ManagedUserRole | ""); setPage(1); }}><option value="">Tất cả vai trò</option>{userRoleOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select>
          <select aria-label="Lọc trạng thái" className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value as UserListParams["status"]); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="inactive">Tạm khóa</option></select>
          <Button size="icon-sm" variant="ghost" aria-label="Tải lại danh sách" title="Tải lại danh sách" onClick={() => { void list.refetch(); void allUsers.refetch(); }} disabled={list.isFetching || allUsers.isFetching} className={styles.refresh}><RefreshCw className={list.isFetching || allUsers.isFetching ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" /></Button>
        </div>
      </form>
      {hasFilters && <div className={styles.filterSummary}><span>Đang lọc{search ? `: “${search}”` : ""}{role ? ` · ${getUserRoleLabel(role)}` : ""}{status ? ` · ${status === "active" ? "Hoạt động" : "Tạm khóa"}` : ""}</span><Button size="xs" variant="ghost" onClick={clearFilters}><X aria-hidden="true" />Xóa bộ lọc</Button></div>}
      {list.isPending ? <div role="status" className={styles.loading}><span className="sr-only">Đang tải người dùng…</span>{Array.from({ length: 5 }, (_, index) => <div key={index} className={styles.skeletonRow} aria-hidden="true"><span /><div><span /><span /></div><span /><span /></div>)}</div>
        : list.isError ? <div role="alert" className={styles.empty}><span className={styles.emptyIcon}><Users size={24} aria-hidden="true" /></span><h3>Chưa thể tải danh sách</h3><p>{list.error.message}</p><Button size="sm" variant="outline" onClick={() => void list.refetch()}>Thử lại</Button></div>
        : <>
          <div aria-busy={list.isFetching}>
            <Table className={styles.table}>
              <caption className="sr-only">Danh sách người dùng, vai trò, tổ chức và trạng thái tài khoản</caption>
              <TableHeader><TableRow>{["Người dùng", "Vai trò", "Tổ chức", "Trạng thái", "Thao tác"].map((title) => <TableHead scope="col" key={title}>{title}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{list.data.users.map((user) => <TableRow key={user.id}>
                <TableCell><div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{initials(user.name)}</span><div className={styles.identityText}><strong>{user.name}</strong><span className={styles.email}>{user.email}</span><span className={`${styles.verification} ${!user.emailVerified ? styles.unverified : ""}`}>{user.emailVerified ? <Check size={12} aria-hidden="true" /> : <Mail size={12} aria-hidden="true" />}{user.emailVerified ? "Đã xác minh email" : "Chưa xác minh email"}</span></div></div></TableCell>
                <TableCell><span className={`${styles.role} ${user.role === "administrator" ? styles.adminRole : ""}`}>{getUserRoleLabel(user.role)}</span></TableCell>
                <TableCell><div className={`${styles.organization} ${!user.organization ? styles.noOrganization : ""}`}>{user.organization && <Building2 size={15} aria-hidden="true" />}<span>{user.organization?.name ?? "Chưa có tổ chức"}</span></div></TableCell>
                <TableCell><Badge className={styles.status} variant={user.isActive ? "success" : "neutral"}><span className={user.isActive ? styles.activeDot : styles.inactiveDot} />{user.isActive ? "Hoạt động" : "Tạm khóa"}</Badge></TableCell>
                <TableCell><div className={styles.actions}><Button size="sm" variant="ghost" aria-label={`Xem / Sửa ${user.name}`} className={styles.editButton} onClick={() => setEditor(user)}><Pencil aria-hidden="true" /><span>Xem / Sửa</span></Button><Button size="icon-sm" variant="ghost" aria-label={`${user.isActive ? "Khóa" : "Bỏ khóa"} ${user.name}`} title={`${user.isActive ? "Khóa" : "Bỏ khóa"} ${user.name}`} disabled={statusMutation.isPending} className={styles.lockButton} onClick={() => { statusMutation.reset(); setStatusTarget(user); }}>{user.isActive ? <LockKeyhole aria-hidden="true" /> : <LockKeyholeOpen aria-hidden="true" />}</Button></div></TableCell>
              </TableRow>)}</TableBody>
            </Table>
            {list.data.users.length === 0 && <div className={styles.empty}><span className={styles.emptyIcon}><Search size={24} aria-hidden="true" /></span><h3>{hasFilters ? "Không tìm thấy người dùng" : "Chưa có người dùng"}</h3><p>{hasFilters ? "Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách." : "Thêm tài khoản đầu tiên để bắt đầu quản lý người dùng."}</p><Button size="sm" variant="outline" onClick={hasFilters ? clearFilters : () => setEditor("new")}>{hasFilters ? "Xóa bộ lọc" : "Thêm người dùng"}</Button></div>}
          </div>
          <footer className={styles.footer}>
            <p role="status">{total > 0 ? <>Hiển thị <strong>{((page - 1) * pageSize + 1).toLocaleString("vi-VN")}–{Math.min(page * pageSize, total).toLocaleString("vi-VN")}</strong> trong <strong>{total.toLocaleString("vi-VN")}</strong> người dùng</> : "0 người dùng"}</p>
            <Pagination aria-label="Phân trang người dùng" className="w-auto justify-end">
              <PaginationContent>
                <PaginationItem><PaginationPrevious disabled={page <= 1 || list.isFetching} onClick={() => setPage(page - 1)} /></PaginationItem>
                <PaginationItem><span className="px-2 text-xs text-muted-foreground tabular-nums">Trang <strong>{page}</strong> / {pageCount}</span></PaginationItem>
                <PaginationItem><PaginationNext disabled={page >= pageCount || list.isFetching} onClick={() => setPage(page + 1)} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </footer>
        </>}
    </div>
    {editor && <UserEditor key={editor === "new" ? "new" : editor.id} user={editor === "new" ? null : editor} close={() => setEditor(null)} saved={() => setPage(1)} />}
    <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => { if (!open && !statusMutation.isPending) setStatusTarget(null); }}><DialogContent busy={statusMutation.isPending}>
      <DialogTitle>{statusTarget?.isActive ? "Khóa tài khoản?" : "Bỏ khóa tài khoản?"}</DialogTitle><DialogDescription>{statusTarget?.isActive ? <>Tài khoản {statusTarget.email} sẽ bị tạm khóa và không thể truy cập hệ thống. Tài khoản và dữ liệu hợp đồng vẫn được giữ lại.</> : <>Tài khoản {statusTarget?.email} sẽ được hoạt động trở lại và có thể truy cập hệ thống.</>}</DialogDescription>
      {statusMutation.isError && <p role="alert" className="text-sm text-destructive">{statusMutation.error.message}</p>}
      <DialogFooter><Button variant="outline" disabled={statusMutation.isPending} onClick={() => setStatusTarget(null)}>Hủy</Button><Button variant={statusTarget?.isActive ? "destructive" : "default"} loading={statusMutation.isPending} onClick={() => statusTarget && statusMutation.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive }, { onSuccess: () => { setStatusTarget(null); setPage(1); toast.success(statusTarget.isActive ? "Đã khóa tài khoản." : "Đã bỏ khóa tài khoản."); } })}>{statusTarget?.isActive ? "Xác nhận khóa" : "Xác nhận bỏ khóa"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>;
}

