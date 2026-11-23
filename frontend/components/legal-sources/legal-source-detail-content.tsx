"use client";

import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { legalSourcePublishers, legalSourceStatuses, legalSourceTypes } from "@/config/legal-source-display";
import type { LegalSource } from "@/types/legal-sources";
import type { LegalSourceDetailWorkflow } from "@/hooks/legal-sources/use-legal-source-detail";
import { LegalSourceCoverage } from "./legal-source-coverage";
import { LegalSourceIngestionStatus, formatLegalDate } from "./legal-source-ingestion-status";
import { LegalSourceParts } from "./legal-source-parts";
import { LegalSourceAppendDialog } from "./legal-source-append-dialog";
import { LegalSourceEditDialog } from "./legal-source-edit-dialog";
import { LegalSourceDeleteConfirmation } from "./legal-source-delete-confirmation";
import { LegalSourceDetailActions, LegalSourceDeleteSection } from "./legal-source-detail-actions";

function LegalSourceOriginDetails({ source }: { source: LegalSource }) {
  const origin = source.origin;
  return (
    <>
      <div className="min-w-0">
        <dt className="text-muted-foreground">Nơi lấy văn bản</dt>
        <dd className="mt-1 break-words font-medium">
          {origin?.publisher ? legalSourcePublishers[origin.publisher] : "Chưa khai báo"}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground">Ngày truy cập</dt>
        <dd className="mt-1 break-words font-medium">{formatLegalDate(origin?.retrievedAt)}</dd>
      </div>
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-muted-foreground">Đường link văn bản</dt>
        <dd className="mt-1 break-all font-medium">
          {origin?.url ? (
            <a
              href={origin.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              {origin.url}
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ) : (
            "—"
          )}
        </dd>
      </div>
      {source.gazette && (
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-muted-foreground">Số Công báo</dt>
          <dd className="mt-1 break-words font-medium">{source.gazette}</dd>
        </div>
      )}
    </>
  );
}

export function LegalSourceDetailContent({ workflow }: { workflow: LegalSourceDetailWorkflow }) {
  const { query, source, busy, append, editing, deleting, error } = workflow;
  if (query.isPending) return <div role="status" className="space-y-4 py-3"><p className="text-ui text-muted-foreground">Đang tải nguồn pháp lý…</p><div className="h-32 rounded-xl bg-muted motion-safe:animate-pulse" /><div className="h-48 rounded-xl bg-muted motion-safe:animate-pulse" /></div>;
  if (!source) return <section role="alert" className="rounded-xl border border-border bg-card p-6"><h2 className="text-ui-card font-semibold">Không thể mở nguồn pháp lý</h2><p className="my-3 text-ui">{query.error?.message || "Nguồn không tồn tại."}</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>Thử lại</Button></section>;
  return <div className="space-y-5 text-card-foreground">
    <div className="flex flex-wrap gap-2"><Badge variant="info">{legalSourceTypes[source.sourceType]}</Badge><Badge variant={source.status === "in_force" ? "success" : source.status === "repealed" ? "danger" : source.status === "amended" ? "warning" : "neutral"}>{source.status ? legalSourceStatuses[source.status] : "Chưa rõ hiệu lực"}</Badge>{source.inCatalog === false && <Badge variant="warning">Ngoài danh mục</Badge>}</div>
    {source.inCatalog === false && <p className="text-ui-meta text-amber-800">Mã nguồn không nằm trong danh mục nên văn bản này không gắn với loại hợp đồng nào. Hệ thống chỉ tra cứu nó khi kho chưa có văn bản chính của hợp đồng đang rà soát.</p>}
    <LegalSourceDetailActions busy={busy || deleting || append || editing} fetching={query.isFetching} onAppend={workflow.openAppend} onEdit={workflow.openEdit} onRefresh={() => query.refetch()} />
    {query.isError && <p role="alert" className="text-ui text-destructive">Chưa cập nhật được trạng thái. Dữ liệu bên dưới là lần tải gần nhất. {query.error.message}</p>}
    {error && !deleting && <p role="alert" className="text-ui text-destructive">{error}</p>}
    <dl className="grid gap-4 rounded-xl border border-border bg-muted/20 p-5 text-ui sm:grid-cols-2">
      {[["Mã nguồn", source.code || "—"], ["Mã trích dẫn", source.citationLabel], ["Số hiệu", source.documentNumber || "—"], ["Cơ quan ban hành", source.issuingBody || "—"], ["Ngày ban hành", formatLegalDate(source.issuedDate)], ["Ngày hiệu lực", formatLegalDate(source.effectiveDate)], ["Ngày hết hiệu lực", formatLegalDate(source.expiryDate)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
      <LegalSourceOriginDetails source={source} />
    </dl>
    <div className="grid gap-5 lg:grid-cols-2"><LegalSourceIngestionStatus ingestion={source.ingestion} actions={source.ingestion?.status !== "completed" && <Button className="w-full sm:w-auto" disabled={busy || deleting || append || editing} loading={workflow.resumePending} variant="outline" onClick={() => void workflow.resumeSource()}>{!workflow.resumePending && <Play aria-hidden="true" />}Tiếp tục xử lý</Button>} /><LegalSourceCoverage coverage={source.coverage} /></div>
    <LegalSourceParts parts={source.parts} />
    <LegalSourceDeleteSection disabled={busy || append || editing} processing={["queued", "running"].includes(source.ingestion?.status ?? "")} onDelete={workflow.openDeletion} />
    {deleting && <LegalSourceDeleteConfirmation source={source} pending={workflow.deletePending} error={error} onCancel={workflow.cancelDeletion} onConfirm={() => void workflow.deleteSource()} />}
    {append && <LegalSourceAppendDialog id={source._id} title={source.title} onClose={workflow.closeAppend} />}
    {editing && <LegalSourceEditDialog source={source} onClose={workflow.closeEdit} />}
  </div>;
}
