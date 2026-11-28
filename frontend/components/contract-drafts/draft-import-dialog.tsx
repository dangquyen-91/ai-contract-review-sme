"use client";

import { useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportContractDraft } from "@/hooks/contract-drafts/use-import-contract-draft";
import type { ContractTemplate } from "@/types/contract-drafts";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".docx,.pdf,.txt";
const templateKey = (template: ContractTemplate) => template.id ?? template.code;
const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

export function DraftImportDialog({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ContractTemplate[];
}) {
  const importDraft = useImportContractDraft();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [party, setParty] = useState("");
  const template = templates.find((item) => templateKey(item) === templateId) ?? templates[0];
  const ourParty = template?.parties.some((item) => item.code === party) ? party : template?.parties[0].code;
  const pending = importDraft.isPending || importDraft.isSuccess;

  function pick(next?: File) {
    importDraft.reset();
    if (!next) return;
    if (!/\.(docx|pdf|txt)$/i.test(next.name)) {
      setFile(null);
      setFileError("Chỉ hỗ trợ tệp Word .docx, PDF có chữ hoặc TXT.");
    } else if (next.size > MAX_BYTES) {
      setFile(null);
      setFileError("Tệp tối đa 10 MB.");
    } else {
      setFile(next);
      setFileError("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFile(null);
          setFileError("");
          importDraft.reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent busy={pending} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hợp đồng của bạn</DialogTitle>
          <DialogDescription>
            Tải lên hợp đồng sẵn có để chỉnh sửa trực tiếp trên trình soạn thảo và nhờ trợ lý AI rà soát từng điều khoản.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file || !template || !ourParty) return;
            importDraft.mutate({
              file,
              templateCode: template.code,
              ...(template.id ? { templateId: template.id } : {}),
              ourParty,
            });
          }}
        >
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!pending) pick(event.dataTransfer.files[0]);
            }}
            className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-7 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-200"
          >
            <input
              type="file"
              accept={ACCEPT}
              disabled={pending}
              className="sr-only"
              onChange={(event) => {
                pick(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <span className="grid size-11 place-items-center rounded-full bg-white text-slate-600 shadow-sm">
              <FileUp size={20} aria-hidden="true" />
            </span>
            <span className="mt-3 text-sm font-medium text-slate-800">
              {file ? "Chọn tệp khác" : "Chọn hoặc kéo thả tệp vào đây"}
            </span>
            <span className="mt-1 text-xs text-slate-500">Word .docx, PDF có chữ hoặc TXT · tối đa 10 MB</span>
          </label>
          {file && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{file.name}</span>
              <span className="shrink-0 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <button
                type="button"
                disabled={pending}
                aria-label="Bỏ tệp đã chọn"
                onClick={() => setFile(null)}
                className="grid size-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {fileError && (
            <p role="alert" className="-mt-2 text-sm text-red-600">
              {fileError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Loại hợp đồng</span>
              <select
                className={selectClass}
                disabled={pending || !templates.length}
                value={template ? templateKey(template) : ""}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {templates.map((item) => (
                  <option key={templateKey(item)} value={templateKey(item)}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-700">Vai trò của bạn</span>
              <select
                className={selectClass}
                disabled={pending || !template}
                value={ourParty ?? ""}
                onChange={(event) => setParty(event.target.value)}
              >
                {template?.parties.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {importDraft.error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {importDraft.error.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || !file || !template}>
              {pending ? "Đang mở tệp…" : "Mở để chỉnh sửa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
