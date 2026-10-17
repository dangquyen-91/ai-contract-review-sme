"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLegalSourcesWorkspace } from "@/hooks/use-legal-sources-workspace";
import { LegalSourceDeleteConfirmation } from "./legal-source-delete-confirmation";
import { LegalSourceFilters } from "./legal-source-filters";
import { LegalSourceTable } from "./legal-source-table";
import { LegalSourcePagination } from "./legal-source-pagination";
import { LegalSourceToolbar } from "./legal-source-toolbar";

import { LegalSourceCreateDialog } from "./legal-source-create-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { LegalSourceMetrics } from "./legal-source-metrics";
import { LegalSourceStatusFilters } from "./legal-source-status-filters";
import { LegalSourceCharts } from "./legal-source-charts";
import { LegalSourceAttentionList } from "./legal-source-attention-list";
import { getLegalSourceAnalytics } from "@/lib/legal-source-analytics";
import type { SourceGroup } from "@/lib/legal-source-filtering";
import { LegalSourceDetailDialog } from "./legal-source-detail-dialog";
import type { LegalSource } from "@/types/legal-sources";

export function LegalSources() {
  const workspace = useLegalSourcesWorkspace();
  const [detailId, setDetailId] = useState<string | null>(null);
  function openDetail(source: LegalSource) { setDetailId(source._id); }
  const { query, search, type, filtered, sources, currentPage, totalPages, showForm, deleting, deletePending, deleteError } = workspace;
  const analytics = getLegalSourceAnalytics(query.data ?? []);
  function showSources(group: SourceGroup, sourceType = "all") {
    workspace.clearFilters();
    workspace.changeType(sourceType);
    workspace.changeGroup(group);
    document.getElementById("legal-source-list")?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Vận hành"
          title="Kho dữ liệu pháp lý"
          description="Tra cứu văn bản pháp luật và mẫu hợp đồng được sử dụng làm nguồn tham chiếu."
        />
        <LegalSourceToolbar showForm={showForm} fetching={query.isFetching} onAdd={workspace.openForm} onRefresh={() => query.refetch()} />
      </div>
      <LegalSourceMetrics pending={query.isPending} counts={query.data ? [query.data.length, query.data.filter((source) => source.sourceType !== "standard_template").length, query.data.filter((source) => source.sourceType === "standard_template").length, query.data.reduce((sum, source) => sum + source.chunkCount, 0)] : null} />
      <LegalSourceCharts analytics={analytics} total={query.data?.length ?? 0} pending={query.isPending} unavailable={query.isError && !query.data} onSelectType={(sourceType) => showSources("all", sourceType)} onSelectGroup={(group) => showSources(group)} />
      <LegalSourceAttentionList sources={analytics.attention} pending={query.isPending} unavailable={query.isError && !query.data} onDetail={openDetail} />
      {showForm && (
        <LegalSourceCreateDialog
          onClose={workspace.closeForm}
          onSaved={(source) => { workspace.sourceSaved(); openDetail(source); }}
        />
      )}
      {detailId && <LegalSourceDetailDialog key={detailId} id={detailId} onClose={() => setDetailId(null)} />}
      {deleting && (
        <LegalSourceDeleteConfirmation source={deleting} pending={deletePending} error={deleteError} onConfirm={workspace.removeSource} onCancel={workspace.cancelDeletion} />
      )}
      <section id="legal-source-list" aria-label="Danh sách nguồn pháp lý" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 className="text-ui-section font-semibold">Danh sách nguồn pháp lý</h2><p className="mt-1 text-ui-meta text-muted-foreground">Tra cứu hiệu lực, theo dõi xử lý và kiểm tra tài liệu.</p></div>
          <p role="status" aria-live="polite" className="text-ui-meta text-muted-foreground">{query.data ? `${filtered.length} / ${query.data.length} nguồn phù hợp` : query.isError ? "Chưa tải được danh sách" : "Đang tải danh sách…"}</p>
        </div>
        <LegalSourceFilters search={search} type={type} filters={workspace.filters} hasFilters={workspace.hasFilters} dateError={workspace.dateError} onSearchChange={workspace.changeSearch} onTypeChange={workspace.changeType} onFilterChange={workspace.changeFilter} onClear={workspace.clearFilters} />
        <LegalSourceStatusFilters value={workspace.group} counts={workspace.groupCounts} loaded={Boolean(query.data)} onChange={workspace.changeGroup} />
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
            <p className="px-5 pt-3 text-ui-meta text-muted-foreground sm:hidden">Vuốt ngang bảng để xem tiến trình và thao tác.</p>
            <LegalSourceTable sources={sources} deletePending={deletePending} onDelete={workspace.selectForDeletion} onDetail={openDetail} />
            <LegalSourcePagination total={filtered.length} currentPage={currentPage} totalPages={totalPages} onPage={workspace.setPage} />
          </>
        )}
      </section>
    </>
  );
}
