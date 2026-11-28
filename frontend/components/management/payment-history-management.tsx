"use client";

import { useEffect, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ReceiptText, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useManagedPayments } from "@/hooks/subscription/use-payments";
import { usePaginationPage } from "@/hooks/shared/use-pagination-page";
import { paymentItemLabel, paymentStatusBadge } from "@/lib/subscription/payment-labels";
import { formatMoney } from "@/lib/subscription/subscription-plans";
import type { ManagedPayment, ManagedPaymentFilters, ManagedPaymentPurpose, ManagedPaymentStatus } from "@/types/payment";
import { NativeSelect } from "@/components/ui/native-select";
import { ListPagination } from "@/components/management/list-pagination";
import { formatVietnamDateTime } from "@/lib/format/date-time";
import styles from "@/styles/user_management/user-management.module.css";

const PAGE_SIZE = 20;
const statusOptions: { value: ManagedPaymentStatus; label: string }[] = [
  { value: "fulfilled", label: "Đã thanh toán" },
  { value: "activating", label: "Đang kích hoạt" },
  { value: "pending", label: "Chờ thanh toán" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "failed", label: "Chưa thành công" },
];
const purposeOptions: { value: ManagedPaymentPurpose; label: string }[] = [
  { value: "subscription", label: "Gói dịch vụ" },
  { value: "top_up", label: "Mua thêm lượt" },
  { value: "contract_review", label: "Rà soát theo hợp đồng" },
];

function StatusBadge({ payment }: { payment: ManagedPayment }) {
  const badge = paymentStatusBadge(payment);
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badge.color}`}>
      {badge.label}
    </span>
  );
}

// The status lives in the address so a dashboard link can open, e.g., orders waiting for activation.
const statusParser = parseAsStringLiteral(statusOptions.map((option) => option.value));

export function PaymentHistoryManagement() {
  const [page, setPage] = usePaginationPage();
  const [status, setStatus] = useQueryState("status", statusParser.withOptions({ history: "push" }));
  const [searchInput, setSearchInput] = useState("");
  const [rest, setRest] = useState<Omit<ManagedPaymentFilters, "status">>({ purpose: "", search: "" });
  const filters: ManagedPaymentFilters = { ...rest, status: status ?? "" };
  const [selected, setSelected] = useState<ManagedPayment | null>(null);
  const list = useManagedPayments(page, PAGE_SIZE, filters);
  const hasFilters = Boolean(filters.status || filters.purpose || filters.search);
  const applyFilters = ({ status: nextStatus, ...change }: Partial<ManagedPaymentFilters>) => {
    if (nextStatus !== undefined) void setStatus(nextStatus || null);
    setRest((current) => ({ ...current, ...change }));
    void setPage(1);
  };
  const clearFilters = () => {
    setSearchInput("");
    applyFilters({ status: "", purpose: "", search: "" });
  };
  const summary = [
    filters.search && `“${filters.search}”`,
    statusOptions.find((option) => option.value === filters.status)?.label,
    purposeOptions.find((option) => option.value === filters.purpose)?.label,
  ].filter(Boolean);

  useEffect(() => {
    if (list.data && page > list.data.totalPages) void setPage(list.data.totalPages);
  }, [list.data, page, setPage]);

  return (
    <section className={styles.workspace} aria-label="Lịch sử giao dịch">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <span className={styles.headingIcon}><ReceiptText size={20} aria-hidden="true" /></span>
          <div>
            <h2>
              Lịch sử giao dịch{" "}
              <span className={styles.count}>{list.data ? list.data.total.toLocaleString("vi-VN") : "—"}</span>
            </h2>
            <p>Mọi đơn thanh toán gói dịch vụ, mua thêm lượt và rà soát theo hợp đồng trên hệ thống.</p>
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
              aria-label="Tìm theo mã đơn, tên tài khoản hoặc email"
              placeholder="Tìm theo mã đơn, tên tài khoản hoặc email…"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <Button type="submit" size="sm" variant="ghost" className={styles.searchButton}>Tìm kiếm</Button>
          </div>
          <div className={styles.filters}>
            <NativeSelect
              aria-label="Lọc trạng thái"
              value={filters.status}
              onChange={(event) => applyFilters({ status: event.target.value as ManagedPaymentFilters["status"] })}
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </NativeSelect>
            <NativeSelect
              aria-label="Lọc loại giao dịch"
              value={filters.purpose}
              onChange={(event) => applyFilters({ purpose: event.target.value as ManagedPaymentFilters["purpose"] })}
            >
              <option value="">Tất cả loại giao dịch</option>
              {purposeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </NativeSelect>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Tải lại danh sách"
              title="Tải lại danh sách"
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
          <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">Đang tải lịch sử giao dịch…</p>
        ) : list.isError ? (
          <div role="alert" className="grid justify-items-center gap-3 px-6 py-12 text-center text-sm">
            <p>{list.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>Thử lại</Button>
            {page > 1 && <Button variant="ghost" size="sm" onClick={() => void setPage(1)}>Về trang đầu</Button>}
          </div>
        ) : (
          <div aria-busy={list.isFetching}>
            <Table className="min-w-[860px]">
              <caption className="sr-only">Mã đơn, tài khoản, nội dung, số tiền, trạng thái và thời gian của từng giao dịch</caption>
              <TableHeader>
                <TableRow>
                  {["Mã đơn", "Tài khoản", "Nội dung", "Số tiền", "Trạng thái", "Ngày tạo", "Thao tác"].map((label) => (
                    <TableHead scope="col" key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((payment) => (
                  <TableRow key={payment.orderCode}>
                    <TableCell className="font-mono text-xs">#{payment.orderCode}</TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal">
                      <span className="block font-medium">{payment.account.name}</span>
                      <span className="text-xs text-slate-500">{payment.account.type === "organization" ? "Tổ chức" : "Cá nhân"}</span>
                    </TableCell>
                    <TableCell className="max-w-[240px] whitespace-normal">{paymentItemLabel(payment)}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums font-medium">{formatMoney(payment.amount)}</TableCell>
                    <TableCell><StatusBadge payment={payment} /></TableCell>
                    <TableCell className="whitespace-nowrap">{formatVietnamDateTime(payment.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelected(payment)}>Xem chi tiết</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {list.data.items.length === 0 && (
              <div role="status" className={styles.empty}>
                <h3>{hasFilters ? "Không tìm thấy giao dịch" : "Chưa có giao dịch nào."}</h3>
                {hasFilters && (
                  <>
                    <p>Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ lịch sử.</p>
                    <Button size="sm" variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>
                  </>
                )}
              </div>
            )}
            <ListPagination
              page={page}
              total={list.data.total}
              limit={list.data.limit}
              totalPages={list.data.totalPages}
              busy={list.isFetching}
              unit="giao dịch"
              label="Phân trang giao dịch"
              onPageChange={(next) => void setPage(next)}
            />
          </div>
        )}
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogTitle>Đơn #{selected?.orderCode}</DialogTitle>
          <DialogDescription>Thông tin giao dịch, chỉ để tra cứu.</DialogDescription>
          {selected && (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Trạng thái", <StatusBadge key="status" payment={selected} />],
                ["Số tiền", formatMoney(selected.amount)],
                ["Nội dung", paymentItemLabel(selected)],
                ["Tài khoản", `${selected.account.name} (${selected.account.type === "organization" ? "tổ chức" : "cá nhân"})`],
                ["Người tạo đơn", selected.createdBy ? `${selected.createdBy.name} · ${selected.createdBy.email}` : "—"],
                ["Ngày tạo", formatVietnamDateTime(selected.createdAt)],
                ["Ngày thanh toán", formatVietnamDateTime(selected.paidAt)],
                ["Ngày kích hoạt", formatVietnamDateTime(selected.fulfilledAt)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
