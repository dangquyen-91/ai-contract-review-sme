"use client";
import { LoaderCircle } from "lucide-react";
import { StudioDocumentView } from "@/components/template-studio/studio-document-view";
import { useTemplatePreview } from "@/hooks/managed-templates/use-template-preview";
import type { TemplateDefinition } from "@/types/managed-templates";
import styles from "@/styles/template-studio.module.css";

/** The contract a user opens from this template, including unsaved edits. */
export function TemplatePreview({ definition }: { definition: TemplateDefinition }) {
  const preview = useTemplatePreview(definition);
  return (
    <section aria-label="Xem trước hợp đồng" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">Xem trước hợp đồng</h2>
          <p className="text-xs text-slate-500">Như người dùng thấy khi mở mẫu, gồm cả thay đổi chưa lưu.</p>
        </div>
        {preview.updating && (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Đang cập nhật…
          </span>
        )}
      </header>
      {preview.isError && (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs leading-5 text-amber-800">
          Chưa cập nhật được bản xem trước: {preview.error.message}
          {preview.data ? " Đang hiển thị bản hợp lệ gần nhất." : ""}
        </p>
      )}
      <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-4 sm:p-6">
        {preview.data ? (
          <article className={`${styles.document} mx-auto max-w-[820px] bg-white px-8 py-10 font-[Times_New_Roman,serif] text-[13pt] leading-relaxed shadow-sm sm:px-14`}>
            <StudioDocumentView document={preview.data.document} template={preview.data.template} />
          </article>
        ) : (
          !preview.isError && <p role="status" className="py-16 text-center text-sm text-slate-500">Đang dựng bản xem trước…</p>
        )}
      </div>
    </section>
  );
}
