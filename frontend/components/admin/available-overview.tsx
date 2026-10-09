"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

type Source = {
  _id: string;
  title: string;
  citationLabel: string;
  sourceType: "law" | "standard_template";
  chunkCount: number;
};

export function AvailableOverview({
  compact = false,
  showLink = true,
}: {
  compact?: boolean;
  showLink?: boolean;
}) {
  const sources = useQuery({
    queryKey: ["admin", "legal-sources"],
    queryFn: () => apiRequest<Source[]>({ url: "/admin/legal-sources" }),
    retry: false,
  });
  const health = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiRequest<{ status: string }>({ url: "/admin/health" }),
    retry: false,
    staleTime: 30000,
  });
  const counts = sources.data
    ? [
        sources.data.length,
        sources.data.filter((source) => source.sourceType === "law").length,
        sources.data.filter(
          (source) => source.sourceType === "standard_template",
        ).length,
        sources.data.reduce((total, source) => total + source.chunkCount, 0),
      ]
    : null;
  const sourceTotal = counts?.[0] ?? 0;
  const lawTotal = counts?.[1] ?? 0;
  const templateTotal = counts?.[2] ?? 0;
  const lawPercent = sourceTotal ? (lawTotal / sourceTotal) * 100 : 0;
  const templatePercent = sourceTotal ? (templateTotal / sourceTotal) * 100 : 0;
  const topSources = [...(sources.data ?? [])]
    .sort((left, right) => right.chunkCount - left.chunkCount)
    .slice(0, 5);
  const largestChunkCount = Math.max(
    1,
    ...topSources.map((source) => source.chunkCount),
  );
  return (
    <section
      aria-labelledby="available-overview-title"
      className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_20px_50px_-42px_rgb(30_70_135_/_0.45)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-100 bg-[#f8fbff] p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
            <span className="text-lg" aria-hidden="true">
              §
            </span>
          </span>
          <div>
            <h2 id="available-overview-title" className="font-semibold">
              Kho dữ liệu pháp lý
            </h2>
            <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              Dữ liệu từ API hiện có
            </span>
            <p className="mt-1 text-sm text-slate-500">
              Số liệu từ các nguồn tham chiếu hiện có trên hệ thống.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={sources.isFetching || health.isFetching}
          onClick={() => {
            void sources.refetch();
            void health.refetch();
          }}
          className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {sources.isFetching || health.isFetching
            ? "Đang cập nhật…"
            : "Làm mới"}
        </button>
      </div>
      {sources.isError ? (
        <div role="alert" className="p-6 text-sm text-red-700">
          Không thể tải số liệu kho pháp lý. {sources.error.message} Hãy thử làm
          mới.
        </div>
      ) : (
        <dl className="grid grid-cols-2 bg-gradient-to-r from-white via-white to-blue-50/30 xl:grid-cols-4">
          {[
            "Tổng nguồn",
            "Văn bản pháp luật",
            "Mẫu hợp đồng",
            "Đoạn tham chiếu",
          ].map((label, index) => (
            <div key={label} className="border-b border-r border-slate-100 p-6">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd
                aria-label={sources.isPending ? "Đang tải" : undefined}
                className={`mt-3 text-3xl font-semibold tabular-nums ${sources.isPending ? "text-slate-300 motion-safe:animate-pulse" : "text-slate-800"}`}
              >
                {counts ? counts[index].toLocaleString("vi-VN") : "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {!compact && sources.isSuccess && sources.data.length > 0 && (
        <div className="grid border-t border-slate-100 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="border-b border-blue-100 bg-[#f8fbff] p-6 lg:border-b-0 lg:border-r">
            <div>
              <h3 className="text-sm font-semibold">Cơ cấu nguồn</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Phân loại nguồn tham chiếu hiện có.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-7">
              <div className="relative size-36 shrink-0">
                <svg
                  viewBox="0 0 42 42"
                  className="size-full -rotate-90"
                  role="img"
                  aria-label={`${lawTotal} văn bản pháp luật và ${templateTotal} mẫu hợp đồng`}
                >
                  <circle
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="none"
                    stroke="#eef2f7"
                    strokeWidth="5"
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="none"
                    stroke="#2864dc"
                    strokeWidth="5"
                    pathLength="100"
                    strokeDasharray={`${lawPercent} ${100 - lawPercent}`}
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="none"
                    stroke="#93b4ee"
                    strokeWidth="5"
                    pathLength="100"
                    strokeDasharray={`${templatePercent} ${100 - templatePercent}`}
                    strokeDashoffset={-lawPercent}
                  />
                </svg>
                <div className="absolute inset-0 grid place-content-center text-center">
                  <strong className="text-2xl font-semibold tabular-nums">
                    {sourceTotal}
                  </strong>
                  <span className="mt-0.5 text-[11px] text-slate-500">
                    nguồn
                  </span>
                </div>
              </div>
              <dl className="grid min-w-[160px] flex-1 gap-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-slate-600">
                    <span className="size-2.5 rounded-sm bg-[#2864dc]" />
                    Văn bản pháp luật
                  </dt>
                  <dd className="font-semibold tabular-nums">{lawTotal}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-slate-600">
                    <span className="size-2.5 rounded-sm bg-[#93b4ee]" />
                    Mẫu hợp đồng
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {templateTotal}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
          <article className="bg-white p-6">
            <div>
              <h3 className="text-sm font-semibold">
                Nguồn có nhiều đoạn tham chiếu
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Năm nguồn đứng đầu theo số đoạn đã được xử lý.
              </p>
            </div>
            <ol className="mt-6 grid gap-4">
              {topSources.map((source) => {
                const width = (source.chunkCount / largestChunkCount) * 100;
                return (
                  <li
                    key={source._id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2"
                  >
                    <span
                      className="truncate text-sm font-medium"
                      title={source.title}
                    >
                      {source.title}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {source.chunkCount}
                    </span>
                    <svg
                      viewBox="0 0 100 6"
                      preserveAspectRatio="none"
                      className="col-span-2 h-1.5 w-full overflow-hidden rounded-sm"
                      aria-hidden="true"
                    >
                      <rect width="100" height="6" fill="#eef2f7" />
                      <rect width={width} height="6" fill="#5f8de4" />
                    </svg>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>
      )}
      {!compact && sources.isSuccess && (
        <div className="border-t border-slate-100 px-6 py-5">
          <h3 className="text-sm font-medium">Nguồn bổ sung gần đây</h3>
          {sources.data.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {sources.data.slice(0, 3).map((source) => (
                <li
                  key={source._id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="font-medium">{source.title}</span>
                  <span className="text-xs text-slate-500">
                    {source.citationLabel}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Kho pháp lý chưa có nguồn. Mở kho để thêm văn bản đầu tiên.
            </p>
          )}
          {showLink && (
            <Link
              href="/dashboard/admin/legal-sources"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline"
            >
              Mở kho pháp lý →
            </Link>
          )}
        </div>
      )}
      <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
        <div
          role="status"
          className={`flex items-center gap-2 text-sm font-medium ${health.isError ? "text-amber-800" : "text-slate-700"}`}
        >
          <span
            className={`size-2.5 rounded-full ${health.isError ? "bg-amber-400" : health.data?.status === "ok" ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          <span>
            Kết nối máy chủ:{" "}
            {health.isFetching
              ? "Đang kiểm tra…"
              : health.isError
                ? "Chưa xác nhận được"
                : health.data?.status === "ok"
                  ? "Máy chủ có phản hồi"
                  : "Chưa kiểm tra"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Kiểm tra khả năng phản hồi của máy chủ; chưa phản ánh trạng thái xử lý
          AI hoặc cơ sở dữ liệu.
        </p>
        {health.isSuccess && (
          <p className="mt-1 text-xs text-slate-500">
            Kiểm tra lúc{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(health.dataUpdatedAt)}{" "}
            (giờ Việt Nam)
          </p>
        )}
        {compact && (
          <Link
            href="/dashboard/admin/legal-sources"
            className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-blue-700 hover:underline"
          >
            Xem phân tích và nguồn pháp lý →
          </Link>
        )}
      </div>
    </section>
  );
}
