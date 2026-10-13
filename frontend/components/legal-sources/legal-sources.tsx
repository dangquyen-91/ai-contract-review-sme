"use client";

import { Button } from "@/components/ui/button";
import { useLegalSourcesWorkspace } from "@/hooks/use-legal-sources-workspace";
import { LegalSourceDeleteConfirmation } from "./legal-source-delete-confirmation";
import { LegalSourceFilters } from "./legal-source-filters";
import { LegalSourceTable } from "./legal-source-table";
import { LegalSourcePagination } from "./legal-source-pagination";
import { LegalSourceToolbar } from "./legal-source-toolbar";

import { LegalSourceForm } from "@/components/legal-sources/legal-source-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { AvailableOverview } from "@/components/legal-sources/legal-source-overview";

export function LegalSources() {
  const workspace = useLegalSourcesWorkspace();
  const { query, search, type, filtered, sources, currentPage, totalPages, showForm, deleting, deletePending, deleteError } = workspace;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Vận hành"
          title="Kho dữ liệu pháp lý"
          description="Tra cứu văn bản pháp luật và mẫu hợp đồng được sử dụng làm nguồn tham chiếu."
        />
        <LegalSourceToolbar showForm={showForm} fetching={query.isFetching} onAdd={workspace.openForm} onRefresh={() => { void query.refetch(); }} />
      </div>
      <AvailableOverview showLink={false} />
      {showForm && (
        <LegalSourceForm
          onCancel={workspace.closeForm}
          onSaved={workspace.sourceSaved}
        />
      )}
      {deleting && (
        <LegalSourceDeleteConfirmation source={deleting} pending={deletePending} error={deleteError} onConfirm={workspace.removeSource} onCancel={workspace.cancelDeletion} />
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <LegalSourceFilters search={search} type={type} onSearchChange={workspace.changeSearch} onTypeChange={workspace.changeType} />
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
            <Button variant="outline" size="default"
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="mt-5"
            >
              Thử lại
            </Button>
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
            <LegalSourceTable sources={sources} deletePending={deletePending} onDelete={(source) => { workspace.selectForDeletion(source); window.scrollTo({ top: 0, behavior: "instant" }); }} />
            <LegalSourcePagination total={filtered.length} currentPage={currentPage} totalPages={totalPages} onPage={workspace.setPage} />
          </>
        )}
      </section>
    </>
  );
}
