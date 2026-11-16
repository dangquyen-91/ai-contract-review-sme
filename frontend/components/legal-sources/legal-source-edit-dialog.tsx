"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { legalSourceStatuses, legalSourceTypes } from "@/config/legal-source-display";
import { useLegalSourceEdit } from "@/hooks/legal-sources/use-legal-source-edit";
import { legalSourceFormValues } from "@/schemas/legal-source.schema";
import type { LegalSource } from "@/types/legal-sources";
import { legalSourceFieldClass as field } from "./legal-source-file-fields";

export function LegalSourceEditDialog({ source, onClose }: { source: LegalSource; onClose: () => void }) {
  const edit = useLegalSourceEdit(source, onClose);
  const values = legalSourceFormValues(source);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !edit.pending) onClose(); }}>
      <DialogContent busy={edit.pending} className="flex h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-w-3xl">
        <DialogHeader className="shrink-0 p-5 pr-12 text-left sm:p-6 sm:pr-12">
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-accent text-primary"><Pencil className="size-5" aria-hidden="true" /></span>
          <DialogTitle>Sửa thông tin nguồn</DialogTitle>
          <DialogDescription className="break-words">{source.title} · Mã nguồn {source.code || "—"} không thay đổi được. Để trống ô không bắt buộc để xóa thông tin đó.</DialogDescription>
        </DialogHeader>
        <form onSubmit={edit.submit} onChange={edit.clearError} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
            <fieldset disabled={edit.pending} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
              <label className="grid gap-2 text-ui sm:col-span-2">Tên nguồn *<input name="title" required minLength={2} maxLength={300} defaultValue={values.title} className={field} /></label>
              <label className="grid gap-2 text-ui">Loại nguồn<select name="sourceType" defaultValue={values.sourceType} className={field}>{Object.entries(legalSourceTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="grid gap-2 text-ui">
                Hiệu lực văn bản
                <select name="status" defaultValue={values.status} className={field}>{Object.entries(legalSourceStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <span className="text-ui-meta text-muted-foreground">Văn bản đã bãi bỏ không còn được tra cứu khi rà soát và hỏi đáp.</span>
              </label>
              <label className="grid gap-2 text-ui">Mã trích dẫn *<input name="citationLabel" required maxLength={100} defaultValue={values.citationLabel} className={field} /></label>
              <label className="grid gap-2 text-ui">Số hiệu văn bản<input name="documentNumber" maxLength={60} defaultValue={values.documentNumber} className={field} /></label>
              <label className="grid gap-2 text-ui">Cơ quan ban hành<input name="issuingBody" maxLength={200} defaultValue={values.issuingBody} className={field} /></label>
              <label className="grid gap-2 text-ui">Ngày ban hành<input name="issuedDate" type="date" defaultValue={values.issuedDate} className={field} /></label>
              <label className="grid gap-2 text-ui">Ngày hiệu lực<input name="effectiveDate" type="date" defaultValue={values.effectiveDate} className={field} /></label>
              <label className="grid gap-2 text-ui">Ngày hết hiệu lực<input name="expiryDate" type="date" defaultValue={values.expiryDate} className={field} /></label>
              <label className="grid gap-2 text-ui">
                Tổng số điều dự kiến
                <input name="expectedArticleCount" type="number" min={1} max={5000} step={1} defaultValue={values.expectedArticleCount} className={field} />
                <span className="text-ui-meta text-muted-foreground">Dùng để đối chiếu độ đầy đủ; hệ thống tính lại sau khi lưu.</span>
              </label>
            </fieldset>
            {edit.error && <p role="alert" className="text-ui text-destructive">{edit.error}</p>}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button variant="outline" disabled={edit.pending} onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={edit.pending} className="min-w-40">Lưu thay đổi</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
