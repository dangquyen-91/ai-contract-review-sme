"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Paperclip, Scale, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import type { StudioReference } from "@/types/template-studio";

export function StudioReferenceList({
  references,
  disabled,
  onChange,
}: {
  references: StudioReference[];
  disabled: boolean;
  onChange: (items: StudioReference[]) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {references.map((item, index) => (
        <span
          key={index}
          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
        >
          <Paperclip size={11} />
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Bỏ tệp ${item.name}`}
            onClick={() =>
              onChange(references.filter((_, position) => position !== index))
            }
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function StudioChatTools({
  draftId,
  legalBasis,
  reviewNotes,
  disabled,
  references,
  onChange,
  onUploading,
}: {
  draftId: string;
  legalBasis: string;
  reviewNotes?: string[];
  disabled: boolean;
  references: StudioReference[];
  onChange: (items: StudioReference[]) => void;
  onUploading: (value: boolean) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lawOpen, setLawOpen] = useState(false);
  const [fileHelp, setFileHelp] = useState(false);
  async function attach(selected?: File) {
    if (!selected || uploading) return;
    setError("");
    if (
      selected.size > 2 * 1024 * 1024 ||
      !/\.(pdf|docx|txt)$/i.test(selected.name)
    ) {
      setError("Chọn PDF có chữ, Word .docx hoặc TXT, tối đa 2 MB.");
      return;
    }
    setUploading(true);
    onUploading(true);
    try {
      const result = await contractDraftsApi.uploadReference(draftId, selected);
      if (
        references.reduce((sum, item) => sum + item.text.length, 0) +
          result.text.length >
        24000
      )
        throw new Error("Tổng tài liệu tối đa 24.000 ký tự. Hãy bỏ bớt tệp.");
      onChange([...references, result]);
      setFileHelp(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa đọc được tệp.");
    } finally {
      setUploading(false);
      onUploading(false);
    }
  }
  return (
    <>
      <input
        ref={file}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        aria-label="Tệp tham khảo hợp đồng"
        onChange={(event) => {
          void attach(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading || references.length >= 3}
        aria-label="Đính kèm tài liệu"
        title="Đính kèm PDF, Word hoặc TXT"
        onClick={() => {
          setFileHelp(true);
          file.current?.click();
        }}
        className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
      >
        {uploading ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <Paperclip size={15} />
        )}
      </button>
      <button
        type="button"
        onClick={() => setLawOpen(true)}
        className="flex shrink-0 items-center gap-1 rounded-md px-1 py-1.5 text-[10px] text-slate-500 hover:bg-slate-100"
      >
        <Scale size={14} />
        Luật áp dụng
      </button>
      {(error || fileHelp) && (
        <div
          className="absolute inset-x-0 bottom-full mb-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-lg"
          role={error ? "alert" : undefined}
        >
          <button
            type="button"
            aria-label="Đóng thông tin tệp"
            onClick={() => {
              setError("");
              setFileHelp(false);
            }}
            className="float-right"
          >
            <X size={13} />
          </button>
          {error ||
            "Tối đa 3 tệp, 2 MB/tệp và 12.000 ký tự/tệp. Nội dung chữ được dùng làm tham khảo khi bạn gửi yêu cầu; chưa tự sửa hợp đồng."}
        </div>
      )}
      {lawOpen && (
        <Dialog open onOpenChange={setLawOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Luật áp dụng</DialogTitle>
              <DialogDescription>
                Căn cứ tham khảo được lưu cùng mẫu hợp đồng này.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              {legalBasis}
            </p>
            {!!reviewNotes?.length && (
              <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">
                {reviewNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            )}
            <p className="text-xs leading-6 text-slate-500">
              Bạn có thể chỉnh phần căn cứ ngay trong văn bản hoặc đính kèm tài
              liệu để nhờ AI đề xuất. Nội dung này chưa xác nhận hiệu lực pháp
              luật tại thời điểm ký.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
