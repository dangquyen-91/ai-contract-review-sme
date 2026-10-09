"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

type SectionConfig = {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  statusIndex: number;
};

const subscribeToDocument = () => () => {};

function statusTone(status: string) {
  if (
    ["Đang hoạt động", "Hoạt động", "Hoàn thành", "Thành công"].includes(status)
  )
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
  if (["Thất bại", "Tạm khóa", "Tạm ngưng"].includes(status))
    return "bg-rose-50 text-rose-700 ring-rose-600/15";
  return "bg-amber-50 text-amber-700 ring-amber-600/15";
}

function DetailInsight({
  section,
  row,
}: {
  section: "organizations" | "users" | "ai-jobs" | "audit-log";
  row: readonly string[];
}) {
  if (section === "organizations") {
    return (
      <section className="mt-6 rounded-xl bg-blue-50 p-5">
        <h3 className="text-sm font-semibold text-blue-950">
          Theo dõi tổ chức
        </h3>
        <p className="mt-2 text-sm leading-6 text-blue-900/75">
          Chủ sở hữu: {row[2]}. Trạng thái hiện tại: {row[3].toLowerCase()}.{" "}
          {row[3] === "Cần xác minh"
            ? "Bước tiếp theo là kiểm tra thông tin pháp lý và người đại diện."
            : "Khi có API, nơi này sẽ hiển thị thành viên, gói dịch vụ và mức sử dụng."}
        </p>
      </section>
    );
  }
  if (section === "users") {
    return (
      <section className="mt-6 rounded-xl bg-emerald-50 p-5">
        <h3 className="text-sm font-semibold text-emerald-950">
          Quyền truy cập
        </h3>
        <p className="mt-2 text-sm leading-6 text-emerald-900/75">
          Vai trò {row[2]} thuộc {row[3]}. Khi có API, admin có thể xem lịch sử
          đăng nhập và quyền thực tế trước khi thay đổi trạng thái tài khoản.
        </p>
      </section>
    );
  }
  if (section === "ai-jobs") {
    return (
      <section className="mt-6 rounded-xl bg-amber-50 p-5">
        <h3 className="text-sm font-semibold text-amber-950">
          Tiến trình xử lý
        </h3>
        <ol className="mt-3 space-y-3 text-sm text-amber-900/75">
          <li>1. Tiếp nhận tác vụ · {row[4]}</li>
          <li>2. Phân tích hợp đồng · {row[3]}</li>
          <li>3. Kết quả · {row[2]}</li>
        </ol>
        <p className="mt-4 border-t border-amber-200 pt-3 text-xs leading-5 text-amber-800">
          Mã lỗi, nguyên nhân và thao tác xử lý lại sẽ xuất hiện khi có API giám
          sát.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-6 rounded-xl bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-900">Dấu vết quản trị</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {row[0]} thực hiện “{row[1]}” với {row[2]}. Kết quả:{" "}
        {row[3].toLowerCase()}. Khi có API, nơi này sẽ có mã sự kiện và thông
        tin thay đổi trước/sau.
      </p>
    </section>
  );
}

export function AdminSectionTable({
  section,
  config,
  initialStatus = "",
  initialItem = "",
}: {
  section: "organizations" | "users" | "ai-jobs" | "audit-log";
  config: SectionConfig;
  initialStatus?: string;
  initialItem?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [secondary, setSecondary] = useState("");
  const [extra, setExtra] = useState("");
  const [sortDescending, setSortDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(
    config.rows.find((row) => row[0] === initialItem) ?? null,
  );
  const popupCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const portalTarget = useSyncExternalStore(
    subscribeToDocument,
    () => document.body,
    () => null,
  );
  useEffect(() => {
    if (!selected || !portalTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    popupCloseRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
      previousFocusRef.current?.focus();
    };
  }, [selected, portalTarget]);
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
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <span className="sr-only">
                Tìm kiếm {config.title.toLowerCase()}
              </span>
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm..."
                className="min-h-10 w-52 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label>
              <span className="sr-only">Lọc theo trạng thái</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả trạng thái</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">
                Lọc theo {secondaryLabel.toLowerCase()}
              </span>
              <select
                value={secondary}
                onChange={(event) => {
                  setSecondary(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 max-w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả {secondaryLabel.toLowerCase()}</option>
                {secondaryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sắp xếp theo tên hoặc mã</span>
              <select
                value={sortDescending ? "desc" : "asc"}
                onChange={(event) => {
                  setSortDescending(event.target.value === "desc");
                  setPage(1);
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="asc">Tên / mã A–Z</option>
                <option value="desc">Tên / mã Z–A</option>
              </select>
            </label>
            <label>
              <span className="sr-only">
                Lọc theo {extraLabel.toLowerCase()}
              </span>
              <select
                value={extra}
                onChange={(event) => {
                  setExtra(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 max-w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả {extraLabel.toLowerCase()}</option>
                {extraOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusTone(cell)}`}
                        >
                          {cell}
                        </span>
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
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="min-h-9 whitespace-nowrap rounded-md px-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      Xem chi tiết
                    </button>
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
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </nav>
        </div>
      </section>
      {selected &&
        portalTarget &&
        createPortal(
          <div
            className="overflow-y-auto bg-slate-950/45 p-4"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "grid",
              placeItems: "center",
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelected(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-detail-title"
              aria-describedby="admin-detail-description"
              className="overflow-y-auto rounded-2xl bg-white text-slate-800 shadow-[0_32px_90px_-30px_rgb(15_23_42_/_0.45)]"
              style={{ width: "min(100%, 680px)", maxHeight: "86dvh" }}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  popupCloseRef.current?.focus();
                }
              }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {config.title} · Bản xem trước
                    </p>
                    <h2
                      id="admin-detail-title"
                      className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
                    >
                      {selected[0]}
                    </h2>
                    <p
                      id="admin-detail-description"
                      className="mt-2 text-sm text-slate-500"
                    >
                      Thông tin chi tiết minh họa cho giao diện quản trị.
                    </p>
                  </div>
                  <button
                    ref={popupCloseRef}
                    type="button"
                    onClick={() => setSelected(null)}
                    autoFocus
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Đóng
                  </button>
                </div>
                <dl className="mt-6 grid gap-x-6 gap-y-5 rounded-xl border border-slate-100 bg-[#fafcff] p-5 sm:grid-cols-2">
                  {config.columns.map((column, index) => (
                    <div key={column} className="min-w-0">
                      <dt className="text-xs font-medium text-slate-500">
                        {column}
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
                        {selected[index]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <DetailInsight section={section} row={selected} />
                <p className="mt-6 text-xs leading-5 text-slate-500">
                  Dữ liệu minh họa · Chưa có thao tác quản trị qua API.
                </p>
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
