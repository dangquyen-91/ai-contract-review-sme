"use client";

import { useId } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { FileText, MessageSquareText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { issueDisplay, issueGroups } from "@/config/issue-display";
import type { VerificationFindingForm } from "@/schemas/verification-finding.schema";
import type { ExpertWorkspace } from "@/types/verification-workspace";

const field = "w-full rounded-lg border border-[#d7ddd4] bg-white px-3 py-2.5 text-sm leading-6 text-[#292c28] outline-none transition-shadow placeholder:text-[#93988f] focus-visible:border-[#315eac] focus-visible:ring-2 focus-visible:ring-[#315eac]/15 disabled:cursor-wait disabled:opacity-60 aria-invalid:border-rose-500 [color-scheme:light]";

type Form = UseFormReturn<VerificationFindingForm>;
type TextFieldName = "problem" | "consequences" | "recommendations" | "reason";

function EditorTextField({ form, name, label, placeholder, rows = 3, required = false }: {
  form: Form;
  name: TextFieldName;
  label: string;
  placeholder: string;
  rows?: number;
  required?: boolean;
}) {
  const id = useId();
  const error = form.formState.errors[name];
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#292c28]">
        {label}{required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}
        {!required && <span className="ml-2 text-xs font-normal text-[#73766f]">Không bắt buộc</span>}
      </label>
      <textarea
        {...form.register(name)}
        id={id}
        rows={rows}
        maxLength={name === "reason" ? 2000 : 40020}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${field} block min-h-20 resize-y`}
      />
      {error && <p id={`${id}-error`} role="alert" className="m-0 text-xs leading-5 text-rose-700">{error.message}</p>}
    </div>
  );
}

export function FindingEditorFields({ form, clauses, editing, busy }: {
  form: Form;
  clauses: ExpertWorkspace["clauses"];
  editing: boolean;
  busy: boolean;
}) {
  const id = useId();
  const title = useWatch({ control: form.control, name: "title" });
  const errors = form.formState.errors;
  return (
    <fieldset disabled={busy} className="m-0 min-w-0 space-y-5 border-0 p-0">
      <section className="space-y-4" aria-labelledby={`${id}-context`}>
        <h3 id={`${id}-context`} className="m-0 flex items-center gap-2 text-sm font-semibold text-[#292c28]">
          <FileText aria-hidden="true" className="size-4 text-[#73766f]" />Thông tin vấn đề
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={`${id}-title`} className="text-sm font-medium">Tiêu đề <span aria-hidden="true" className="text-rose-600">*</span></label>
            <span className="text-xs tabular-nums text-[#73766f]">{title?.length ?? 0}/300</span>
          </div>
          <Input
            {...form.register("title")}
            id={`${id}-title`}
            maxLength={300}
            placeholder="Ví dụ: Chưa quy định thời hạn thanh toán"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            className={`${field} h-11 focus-visible:ring-2`}
          />
          {errors.title && <p id={`${id}-title-error`} role="alert" className="m-0 text-xs text-rose-700">{errors.title.message}</p>}
        </div>
        <div className={`grid min-w-0 gap-4 ${editing ? "" : "sm:grid-cols-2"}`}>
          <div className="min-w-0 space-y-1.5">
            <label htmlFor={`${id}-group`} className="text-sm font-medium">Nhóm vấn đề</label>
            <select {...form.register("checkGroup")} id={`${id}-group`} className={field} aria-invalid={Boolean(errors.checkGroup)}>
              {issueGroups.map((group) => <option key={group} value={group}>{issueDisplay[group].label}</option>)}
            </select>
            {errors.checkGroup && <p role="alert" className="m-0 text-xs text-rose-700">{errors.checkGroup.message}</p>}
          </div>
          {!editing && (
            <div className="min-w-0 space-y-1.5">
              <label htmlFor={`${id}-clause`} className="text-sm font-medium">Điều khoản liên quan</label>
              <select {...form.register("clauseIndex")} id={`${id}-clause`} className={`${field} truncate`} aria-invalid={Boolean(errors.clauseIndex)}>
                <option value="">Toàn hợp đồng / thiếu điều khoản</option>
                {clauses.map((clause) => <option key={clause._id} value={clause.index}>{clause.title || `Điều khoản ${clause.index}`}</option>)}
              </select>
              {errors.clauseIndex && <p role="alert" className="m-0 text-xs text-rose-700">{errors.clauseIndex.message}</p>}
            </div>
          )}
        </div>
      </section>
      <section className="space-y-4 border-t border-[#e4e6df] pt-5" aria-labelledby={`${id}-analysis`}>
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <h3 id={`${id}-analysis`} className="m-0 flex items-center gap-2 text-sm font-semibold text-[#292c28]">
            <MessageSquareText aria-hidden="true" className="size-4 text-[#73766f]" />Phân tích và đề xuất
          </h3>
          <p className="m-0 text-xs text-[#73766f]">Mỗi ý trên một dòng</p>
        </div>
        <EditorTextField form={form} name="problem" label="Nội dung vấn đề" placeholder="Mô tả nội dung chưa rõ, còn thiếu hoặc cần điều chỉnh trong hợp đồng…" required />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <EditorTextField form={form} name="consequences" label="Hậu quả" placeholder="Ảnh hưởng có thể phát sinh với các bên…" />
          <EditorTextField form={form} name="recommendations" label="Khuyến nghị" placeholder="Đề xuất làm rõ hoặc sửa đổi điều khoản…" />
        </div>
        <EditorTextField form={form} name="reason" label={editing ? "Lý do điều chỉnh" : "Ghi chú bổ sung"} placeholder="Ghi lại căn cứ hoặc giải thích thêm cho quyết định của bạn…" rows={2} />
      </section>
    </fieldset>
  );
}
