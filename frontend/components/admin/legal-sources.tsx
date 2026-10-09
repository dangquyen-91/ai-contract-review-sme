"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, apiRequest } from "@/lib/api/client";
import { toast } from "sonner";
import { LegalSourceForm } from "./legal-source-form";
import { EmptyState, PageHeading } from "./admin-panels";
import { Icon } from "@/components/ui/icon";

type LegalSource = {
  _id: string;
  title: string;
  citationLabel: string;
  sourceType: "law" | "standard_template";
  issuingBody?: string;
  effectiveDate?: string;
  chunkCount: number;
};

export function LegalSources() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<LegalSource | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function removeSource() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await apiClient.delete(
        `/admin/legal-sources/${encodeURIComponent(deleting._id)}`,
        { timeout: 190000 },
      );
      setDeleting(null);
      toast.success("Đã xóa nguồn pháp lý");
      await query.refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Không thể xóa nguồn pháp lý.",
      );
    } finally {
      setDeletePending(false);
    }
  }
  const query = useQuery({
    queryKey: ["admin", "legal-sources"],
    queryFn: () => apiRequest<LegalSource[]>({ url: "/admin/legal-sources" }),
    retry: false,
  });
  const filtered = (query.data ?? []).filter(
    (source) =>
      (type === "all" || source.sourceType === type) &&
      `${source.title} ${source.citationLabel} ${source.issuingBody ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const sources = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Vận hành"
          title="Kho dữ liệu pháp lý"
          description="Tra cứu văn bản pháp luật và mẫu hợp đồng được sử dụng làm nguồn tham chiếu."
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={showForm}
            onClick={() => setShowForm(true)}
            className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Thêm nguồn
          </button>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {query.isFetching ? "Đang tải…" : "Làm mới"}
          </button>
        </div>
      </div>
      {showForm && (
        <LegalSourceForm
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setSearch("");
            setType("all");
            setPage(1);
            toast.success("Đã thêm nguồn pháp lý");
            void query.refetch();
          }}
        />
      )}
      {deleting && (
        <section
          aria-labelledby="delete-source-title"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <h2 id="delete-source-title" className="font-semibold text-red-900">
            Xóa nguồn pháp lý?
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-900">
            Nguồn “{deleting.title}” và các đoạn tham chiếu của nguồn sẽ bị xóa
            khỏi kho. Không thể hoàn tác thao tác này.
          </p>
          {deleteError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {deleteError}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={deletePending}
              onClick={removeSource}
              className="min-h-11 rounded-lg bg-red-700 px-4 text-sm text-white disabled:opacity-50"
            >
              {deletePending ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => setDeleting(null)}
              className="min-h-11 rounded-lg border border-red-200 bg-white px-4 text-sm disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 p-5">
          <label className="grid min-w-0 flex-1 gap-2 text-xs font-medium text-slate-600">
            <span>Tìm nguồn tham chiếu</span>
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-blue-600">
              <Icon name="search" className="size-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
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
                setType(event.target.value);
                setPage(1);
              }}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal focus-visible:outline-blue-600"
            >
              <option value="all">Tất cả loại nguồn</option>
              <option value="law">Văn bản pháp luật</option>
              <option value="standard_template">Mẫu hợp đồng</option>
            </select>
          </label>
        </div>
        {query.isLoading ? (
          <div
            role="status"
            aria-label="Đang tải kho pháp lý"
            className="space-y-4 p-6"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-14 rounded bg-slate-100 motion-safe:animate-pulse"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div role="alert" className="p-8">
            <h2 className="font-semibold">Chưa thể tải nguồn pháp lý</h2>
            <p className="mt-2 text-sm text-slate-600">{query.error.message}</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="mt-5 min-h-11 rounded-lg bg-blue-700 px-4 text-sm text-white disabled:opacity-50"
            >
              Thử lại
            </button>
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon="scales"
            title={
              query.data?.length
                ? "Không tìm thấy nguồn phù hợp"
                : "Chưa có nguồn pháp lý"
            }
            description={
              query.data?.length
                ? "Thử đổi từ khóa hoặc chọn loại nguồn khác."
                : "Văn bản và mẫu hợp đồng sẽ xuất hiện tại đây sau khi được bổ sung vào kho pháp lý."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Văn bản / nguồn",
                      "Loại nguồn",
                      "Cơ quan ban hành",
                      "Ngày hiệu lực",
                      "Đoạn tham chiếu",
                      "Thao tác",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-4 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sources.map((source) => (
                    <tr key={source._id} className="hover:bg-slate-50/70">
                      <td className="max-w-sm px-5 py-5">
                        <p className="font-medium leading-6">{source.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {source.citationLabel}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <span className="whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          {source.sourceType === "law"
                            ? "Văn bản pháp luật"
                            : "Mẫu hợp đồng"}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-slate-600">
                        {source.issuingBody || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                        {source.effectiveDate &&
                        !Number.isNaN(Date.parse(source.effectiveDate))
                          ? new Intl.DateTimeFormat("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                            }).format(new Date(source.effectiveDate))
                          : "—"}
                      </td>
                      <td className="px-5 py-5 font-mono tabular-nums text-slate-600">
                        {source.chunkCount}
                      </td>
                      <td className="px-5 py-5">
                        <button
                          type="button"
                          disabled={deletePending}
                          aria-label={`Xóa ${source.title}`}
                          onClick={() => {
                            setDeleting(source);
                            setDeleteError("");
                            window.scrollTo({ top: 0, behavior: "instant" });
                          }}
                          className="min-h-11 rounded-lg px-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
              <span>
                {filtered.length} nguồn · Trang {currentPage}/{totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="min-h-10 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="min-h-10 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
