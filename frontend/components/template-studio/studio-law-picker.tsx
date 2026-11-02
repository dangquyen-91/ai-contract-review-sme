"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_STUDIO_LAWS,
  useStudioLawPicker,
} from "@/hooks/contract-drafts/use-studio-laws";
import type { StudioLaw } from "@/types/template-studio";
import type { TemplateCode } from "@/types/contract-drafts";
import { StudioLawPreview } from "./studio-law-preview";

function Highlight({ text, search }: { text: string; search: string }) {
  const term = search.trim();
  const index = term
    ? text.toLocaleLowerCase("vi").indexOf(term.toLocaleLowerCase("vi"))
    : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-amber-100 text-inherit">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  );
}

function LawRow({
  law,
  checked,
  disabled,
  search,
  onToggle,
  onPreview,
}: {
  law: StudioLaw;
  checked: boolean;
  disabled: boolean;
  search: string;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 border-b border-slate-100 px-3 last:border-b-0 ${checked ? "bg-blue-50/60" : "hover:bg-white"}`}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 has-disabled:cursor-default has-disabled:opacity-50">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          aria-label={`Chọn ${law.title}`}
          className="size-[18px] shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-default"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-800">
            <Highlight
              text={law.documentNumber || law.citationLabel}
              search={search}
            />
          </span>
          <span
            className="mt-0.5 block truncate text-xs leading-5 text-slate-500"
            title={law.title}
          >
            <Highlight text={law.title} search={search} />
          </span>
        </span>
      </label>
      <button
        type="button"
        aria-label={`Xem ${law.title}`}
        title="Xem văn bản"
        onClick={onPreview}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Eye size={17} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export function StudioLawPicker({
  templateCode,
  selectedIds,
  disabled,
  onApply,
  onClose,
}: {
  templateCode: TemplateCode;
  selectedIds: string[];
  disabled: boolean;
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const picker = useStudioLawPicker(selectedIds, templateCode);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const emptySelection = picker.selectedOnly && !picker.selected.length;
  const rows = emptySelection ? [] : (picker.list.data?.items ?? []);
  if (previewId)
    return (
      <StudioLawPreview
        key={previewId}
        id={previewId}
        onBack={() => setPreviewId(null)}
      />
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[min(740px,calc(100dvh-2rem))] min-h-0 flex-col gap-4 overflow-hidden rounded-xl bg-[#f8fafc] p-4 sm:max-w-[680px] sm:p-6">
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Chọn luật áp dụng
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-5">
            Tìm và chọn tối đa 10 văn bản để tập trung câu trả lời.{" "}
            <span aria-live="polite">({picker.selected.length}/10)</span>
            {templateCode === "labor" && (
              <span className="mt-1 block text-xs">
                Văn bản lao động từ kho luật của hệ thống.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        {
          <>
            <div className="relative shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                aria-label="Tìm luật áp dụng"
                value={picker.search}
                onChange={(event) => picker.setSearch(event.target.value)}
                maxLength={100}
                placeholder="Tìm theo tên hoặc số hiệu văn bản…"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {picker.search && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm luật"
                  onClick={() => picker.setSearch("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 text-xs">
              <button
                type="button"
                aria-pressed={picker.selectedOnly}
                onClick={() => picker.setSelectedOnly(!picker.selectedOnly)}
                className={`rounded-full border px-3 py-1.5 font-medium ${picker.selectedOnly ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-white"}`}
              >
                Đã chọn ({picker.selected.length})
              </button>
              {picker.selected.length >= MAX_STUDIO_LAWS && (
                <span
                  role="status"
                  className="text-right text-[11px] text-amber-700"
                >
                  Bỏ chọn một văn bản để chọn thêm.
                </span>
              )}
              {picker.selectedOnly &&
                picker.selected.length > 0 &&
                !disabled && (
                  <button
                    type="button"
                    onClick={picker.clearSelection}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-[#f8fafc]"
              aria-label="Danh sách luật"
            >
              {!emptySelection && picker.list.isPending ? (
                <div
                  role="status"
                  className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"
                >
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang tải danh sách luật…
                </div>
              ) : !emptySelection && picker.list.isError ? (
                <div
                  role="alert"
                  className="p-6 text-center text-sm text-slate-500"
                >
                  Chưa tải được danh sách luật.
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mx-auto mt-3 flex"
                    onClick={() => void picker.list.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : !rows.length ? (
                <p className="px-5 py-16 text-center text-sm leading-6 text-slate-500">
                  {emptySelection
                    ? "Bạn chưa chọn văn bản nào."
                    : "Không tìm thấy văn bản phù hợp trong kho luật."}
                </p>
              ) : (
                rows.map((law) => (
                  <LawRow
                    key={law.id}
                    law={law}
                    checked={picker.selected.includes(law.id)}
                    disabled={
                      disabled ||
                      (!picker.selected.includes(law.id) &&
                        picker.selected.length >= MAX_STUDIO_LAWS)
                    }
                    search={picker.search}
                    onToggle={() => picker.toggle(law.id)}
                    onPreview={() => setPreviewId(law.id)}
                  />
                ))
              )}
            </div>
            {!!picker.list.data &&
              !emptySelection &&
              picker.list.data.pages > 1 && (
                <div className="flex shrink-0 items-center justify-between text-xs text-slate-500">
                  <span>
                    {picker.list.data.total} văn bản · Trang {picker.page}/
                    {picker.list.data.pages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Trang luật trước"
                      disabled={picker.page === 1}
                      onClick={() => picker.setPage(picker.page - 1)}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Trang luật tiếp"
                      disabled={picker.page >= picker.list.data.pages}
                      onClick={() => picker.setPage(picker.page + 1)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
          </>
        }
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="max-w-72 text-[10px] leading-4 text-slate-400">
            Lựa chọn được lưu cùng bản nháp; chỉ làm nguồn tham khảo cho trợ lý.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => {
                onApply(picker.selected);
                onClose();
              }}
            >
              <Check size={14} />
              Áp dụng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
