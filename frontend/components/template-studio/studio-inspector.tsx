"use client";
import { Check, ChevronDown, CircleAlert, X } from "lucide-react";
import type { ContractTemplate } from "@/types/contract-drafts";
import type { StudioPresentation } from "./studio-presentation";

export function StudioInspector({
  mode: inspector,
  template,
  input,
  view,
  onClose,
  onJump,
  onChooseField,
}: {
  mode: "fields" | "outline" | null;
  template: ContractTemplate;
  input: Record<string, string>;
  view: StudioPresentation;
  onClose: () => void;
  onJump: (id: string) => void;
  onChooseField: (key: string) => void;
}) {
  const { missing, outline, editable } = view;
  return (
    <>
      {inspector && (
        <div className="absolute inset-y-16 right-0 z-30 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
          <header className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="text-sm font-semibold">
                {inspector === "fields"
                  ? "Thông tin trên mẫu"
                  : "Mục lục hợp đồng"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {inspector === "fields"
                  ? "Nhấp để điền trực tiếp vào vị trí tương ứng."
                  : "Di chuyển nhanh giữa các điều khoản."}
              </p>
            </div>
            <button
              type="button"
              aria-label="Đóng bảng thông tin"
              onClick={() => onClose()}
            >
              <X size={17} className="text-slate-400" />
            </button>
          </header>
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {inspector === "outline"
              ? outline.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onJump(item.id)}
                    className="block w-full rounded-lg px-3 py-3 text-left text-xs leading-5 text-slate-600 hover:bg-slate-50"
                  >
                    {item.text}
                  </button>
                ))
              : template.fields.map((field) => (
                  <button
                    type="button"
                    key={field.key}
                    disabled={!editable}
                    onClick={() => onChooseField(field.key)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full ${missing.some((item) => item.key === field.key) ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-600"}`}
                    >
                      {missing.some((item) => item.key === field.key) ? (
                        <CircleAlert size={12} />
                      ) : (
                        <Check size={12} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-slate-600">
                        {field.label}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-400">
                        {input[field.key]?.slice(0, 80) ||
                          (field.required ? "Cần bổ sung" : "Không bắt buộc")}
                      </span>
                    </span>
                    <ChevronDown
                      size={12}
                      className="ml-auto -rotate-90 text-slate-300"
                    />
                  </button>
                ))}
          </div>
        </div>
      )}
    </>
  );
}
