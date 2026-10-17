"use client";

import { Eye, Trash2, FileText } from "lucide-react";
import type { LegalSource } from "@/types/legal-sources";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { legalSourceTypes, legalSourceStatuses } from "@/config/legal-source-display";
import { LegalSourceProcessingCell } from "./legal-source-processing-cell";

function issuedDate(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa có ngày ban hành";
}

export function LegalSourceTable({ sources, deletePending, onDelete, onDetail }: { sources: LegalSource[]; deletePending: boolean; onDelete: (source: LegalSource) => void; onDetail: (source: LegalSource) => void }) {
  return <Table className="min-w-[850px]">
    <TableHeader><TableRow>{["Văn bản / nguồn", "Loại / hiệu lực", "Xử lý tài liệu", "Đoạn tham chiếu", "Thao tác"].map((label) => <TableHead key={label} scope="col">{label}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{sources.map((source) => <TableRow key={source._id}>
      <TableCell className="min-w-72 max-w-md"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><FileText className="size-4" aria-hidden="true" /></span><div className="min-w-0"><button type="button" aria-haspopup="dialog" onClick={() => onDetail(source)} className="break-words text-left font-semibold leading-6 text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{source.title}</button><p className="mt-1 text-ui-meta text-muted-foreground">{source.documentNumber || source.citationLabel}{source.code ? ` · ${source.code}` : ""}</p><p className="mt-1 text-ui-meta text-muted-foreground">{source.issuingBody || "Chưa có cơ quan ban hành"}</p><p className="mt-1 text-ui-meta text-muted-foreground">{issuedDate(source.issuedDate)}</p></div></div></TableCell>
      <TableCell><div className="flex flex-col items-start gap-2"><Badge variant="info">{legalSourceTypes[source.sourceType]}</Badge><Badge variant={source.status === "in_force" ? "success" : source.status === "repealed" ? "danger" : source.status === "amended" ? "warning" : "neutral"}>{source.status ? legalSourceStatuses[source.status] : "Chưa rõ hiệu lực"}</Badge></div></TableCell>
      <TableCell><LegalSourceProcessingCell source={source} /></TableCell>
      <TableCell className="tabular-nums">{source.chunkCount}</TableCell>
      <TableCell><div className="flex gap-2"><Button size="sm" variant="outline" className="h-11 sm:h-9" aria-haspopup="dialog" aria-label={`Xem chi tiết ${source.title}`} onClick={() => onDetail(source)}><Eye aria-hidden="true" />Chi tiết</Button><Button variant="ghost" size="sm" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9" disabled={deletePending || ["queued", "running"].includes(source.ingestion?.status ?? "")} aria-label={`Xóa ${source.title}`} onClick={() => onDelete(source)}><Trash2 aria-hidden="true" />Xóa</Button></div>{["queued", "running"].includes(source.ingestion?.status ?? "") && <p className="mt-2 text-ui-meta text-muted-foreground">Chờ xử lý xong để xóa</p>}</TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
