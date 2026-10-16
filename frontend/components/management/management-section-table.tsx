"use client";

import { Button } from "@/components/ui/button";

import {
  useMemo,
  useRef,
  useState,
} from "react";
import { SectionDetailDialog } from "./section-detail-dialog";
import type { SectionConfig, ManagementSectionId } from "@/types/management";
import { SectionTableFilters } from "./section-table-filters";
import { Badge } from "@/components/ui/badge";
import { usePaginationPage } from "@/hooks/use-pagination-page";


function statusTone(status: string) {
  if (
    ["Đang hoạt động", "Hoạt động", "Hoàn thành", "Thành công"].includes(status)
  )
    return "success";
  if (["Thất bại", "Tạm khóa", "Tạm ngưng"].includes(status))
    return "danger";
  return "warning";
}

export function ManagementSectionTable({
  section,
  config,
  initialStatus = "",
  initialItem = "",
}: {
  section: ManagementSectionId;
  config: SectionConfig;
  initialStatus?: string;
  initialItem?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [secondary, setSecondary] = useState("");
  const [extra, setExtra] = useState("");
  const [sortDescending, setSortDescending] = useState(false);
  const [page, setPage] = usePaginationPage();
  const [selected, setSelected] = useState(
    config.rows.find((row) => row[0] === initialItem) ?? null,
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const statuses = [
    ...new Set(config.rows.map((row) => row[config.statusIndex])),
  ];
  const secondaryIndex =
    section === "organizations" ? 2 : section === "users" ? 3 : 1;
  const secondaryLabel =
    section === "organizations"
      ? "Chủ sở hữu"
      : section === "audit-log"
        ? "Thao tác"
        : "Tổ chức";
  const secondaryOptions = [
    ...new Set(config.rows.map((row) => row[secondaryIndex])),
  ];
  const extraLabel = section === "users" ? "Vai trò" : "Ngày";
  const extraOptions = [
    ...new Set(
      config.rows.map((row) =>
        section === "users" ? row[2] : row[4].slice(0, 10),
      ),
    ),
  ];
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    return config.rows
      .filter(
        (row) =>
          (!status || row[config.statusIndex] === status) &&
          (!secondary || row[secondaryIndex] === secondary) &&
          (!extra ||
            (section === "users" ? row[2] : row[4].slice(0, 10)) === extra) &&
          (!normalized ||
            row.some((cell) =>
              cell.toLocaleLowerCase("vi-VN").includes(normalized),
            )),
      )
      .sort(
        (left, right) =>
          (sortDescending ? -1 : 1) * left[0].localeCompare(right[0], "vi-VN"),
      );
  }, [
    config.rows,
    config.statusIndex,
    query,
    status,
    secondary,
    secondaryIndex,
    extra,
    section,
    sortDescending,
  ]);
  const totalPages = Math.max(1, Math.ceil(rows.length / 3));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * 3, currentPage * 3);

  function openDetail(row: readonly string[]) {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelected(row);
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs text-amber-800">
        <span className="size-2 rounded-full bg-amber-400" />
        Dữ liệu minh họa để hoàn thiện giao diện — chưa được kết nối API.
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-44px_rgb(30_70_135_/_0.45)]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold">
              {config.title === "Nhật ký quản trị"
                ? "Lịch sử hoạt động"
                : `Danh sách ${config.title.toLowerCase()}`}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tìm kiếm, lọc và mở popup chi tiết trên dữ liệu mẫu.
            </p>
          </div>
          <SectionTableFilters title={config.title} query={query} status={status} secondary={secondary} extra={extra} sortDescending={sortDescending} statuses={statuses} secondaryLabel={secondaryLabel} secondaryOptions={secondaryOptions} extraLabel={extraLabel} extraOptions={extraOptions}
            onQueryChange={(value) => { setQuery(value); setPage(1); }}
            onStatusChange={(value) => { setStatus(value); setPage(1); }}
            onSecondaryChange={(value) => { setSecondary(value); setPage(1); }}
            onExtraChange={(value) => { setExtra(value); setPage(1); }}
            onSortChange={(value) => { setSortDescending(value); setPage(1); }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
              <tr>
                {config.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-6 py-4 font-medium"
                  >
                    {column}
                  </th>
                ))}
                <th scope="col" className="px-6 py-4 font-medium">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => (
                <tr key={row[0]} className="hover:bg-slate-50/80">
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className="whitespace-nowrap px-6 py-4 text-slate-600"
                    >
                      {index === config.statusIndex ? (
                        <Badge variant={statusTone(cell)}>
                          {cell}
                        </Badge>
                      ) : index === 0 ? (
                        <span className="font-medium text-slate-900">
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <Button variant="outline" size="sm"
                      type="button"
                      onClick={() => openDetail(row)}
                      
                    >
                      Xem chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div
            className="px-6 py-12 text-center text-sm text-slate-500"
            role="status"
          >
            Không có bản ghi mẫu phù hợp. Hãy đổi từ khóa hoặc trạng thái.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <span role="status">
            Hiển thị {visibleRows.length} / {rows.length} bản ghi phù hợp ·{" "}
            {config.rows.length} bản ghi mẫu
          </span>
          <nav
            aria-label="Phân trang dữ liệu minh họa"
            className="flex items-center gap-2"
          >
            <Button variant="outline" size="sm"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              
            >
              Trước
            </Button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="sm"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              
            >
              Sau
            </Button>
          </nav>
        </div>
      </section>
      {selected && <SectionDetailDialog selected={selected} section={section} config={config} previousFocusRef={previousFocusRef} onClose={() => setSelected(null)} />}
    </>
  );
}
