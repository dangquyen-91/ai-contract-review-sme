"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LegalSourceUploadActions } from "./legal-source-upload-actions";
import { legalSourceStatuses, legalSourceTypes } from "@/config/legal-source-display";
import type { useLegalSourceUpload } from "@/hooks/use-legal-source-upload";
import { LegalSourcePreview } from "./legal-source-preview";
import { LegalSourceFileFields, legalSourceFieldClass as field } from "./legal-source-file-fields";

export function LegalSourceForm({ upload, onCancel, onChange }: {
  upload: ReturnType<typeof useLegalSourceUpload>; onCancel: () => void; onChange: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLHeadingElement>(null);
  const previewed = Boolean(upload.preview);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    if (previewed) previewRef.current?.focus();
  }, [previewed]);
  return <form onSubmit={upload.submit} onChange={() => { upload.reset(); onChange(); }} aria-busy={upload.pending} className="flex min-h-0 flex-1 flex-col text-card-foreground">
    <div ref={contentRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
    <div hidden={Boolean(upload.preview)}>
    <fieldset disabled={upload.pending} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
      <label className="grid gap-2 text-ui">Tên nguồn *<input name="title" required minLength={2} maxLength={300} className={field} /></label>
      <label className="grid gap-2 text-ui">Mã nguồn *<input name="code" required minLength={2} maxLength={60} pattern="[a-z0-9]+(_[a-z0-9]+)*" placeholder="commercial_law_2005" className={field} /><span className="text-ui-meta text-muted-foreground">Mã duy nhất gồm chữ thường, số và dấu gạch dưới.</span></label>
      <label className="grid gap-2 text-ui">Loại nguồn<select name="sourceType" className={field}>{Object.entries(legalSourceTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 text-ui">Hiệu lực văn bản<select name="status" className={field}>{Object.entries(legalSourceStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-2 text-ui">Mã trích dẫn *<input name="citationLabel" required maxLength={100} placeholder="91/2015/QH13" className={field} /></label>
      <label className="grid gap-2 text-ui">Số hiệu văn bản<input name="documentNumber" maxLength={60} className={field} /></label>
      <label className="grid gap-2 text-ui">Cơ quan ban hành<input name="issuingBody" maxLength={200} className={field} /></label>
      <label className="grid gap-2 text-ui">Ngày ban hành<input name="issuedDate" type="date" className={field} /></label>
      <label className="grid gap-2 text-ui">Ngày hiệu lực<input name="effectiveDate" type="date" className={field} /></label>
      <label className="grid gap-2 text-ui">Ngày hết hiệu lực<input name="expiryDate" type="date" className={field} /></label>
      <LegalSourceFileFields />
    </fieldset>
    </div>
    {upload.preview && <section aria-label="Xem trước và xác nhận"><h2 ref={previewRef} tabIndex={-1} className="mb-4 text-ui-section font-semibold outline-none">Kiểm tra tài liệu trước khi lưu</h2><LegalSourcePreview data={upload.preview} /></section>}
    {upload.error && <p role="alert" className="text-ui text-destructive">{upload.error}</p>}
    </div>
    <div className="shrink-0 px-5 pb-5 sm:px-6">
      {upload.preview ? <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={upload.pending} onClick={upload.reset}><ArrowLeft aria-hidden="true" />Quay lại</Button>
        <Button type="submit" loading={upload.pending} className="min-w-48">Thêm vào kho</Button>
      </div> : <LegalSourceUploadActions pending={upload.pending} previewed={false} saveLabel="Thêm vào kho" onCancel={onCancel} />}
    </div>
  </form>;
}
