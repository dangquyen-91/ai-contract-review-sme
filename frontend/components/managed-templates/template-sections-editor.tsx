"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TemplateDefinition } from "@/types/managed-templates";
import { templateInputClass } from "@/config/managed-templates";

export function TemplateSectionsEditor({
  definition,
  onChange,
  disabled,
}: {
  definition: TemplateDefinition;
  onChange: (value: TemplateDefinition) => void;
  disabled: boolean;
}) {
  function update(
    index: number,
    value: Partial<TemplateDefinition["sections"][number]>,
  ) {
    onChange({
      ...definition,
      sections: definition.sections.map((section, at) =>
        at === index ? { ...section, ...value } : section,
      ),
    });
  }
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-500">
        Viết nội dung điều khoản và chèn ô thông tin để người dùng điền khi tạo
        hợp đồng. Các điều được đánh số tự động.
      </p>
      {definition.sections.map((section, index) => (
        <section
          key={section.key}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Điều {index + 1}</h3>
            <Button
              aria-label={`Xóa điều ${index + 1}`}
              variant="ghost"
              disabled={disabled || definition.sections.length === 1}
              onClick={() =>
                onChange({
                  ...definition,
                  sections: definition.sections.filter((_, at) => at !== index),
                })
              }
            >
              <Trash2 size={16} />
            </Button>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Tiêu đề
            <input
              disabled={disabled}
              maxLength={200}
              className={templateInputClass}
              value={section.title}
              onChange={(event) => update(index, { title: event.target.value })}
            />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-medium">
            Nội dung
            <textarea
              disabled={disabled}
              maxLength={12000}
              rows={8}
              className={`${templateInputClass} leading-7`}
              value={section.body}
              onChange={(event) => update(index, { body: event.target.value })}
            />
          </label>
          <label className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            Chèn ô thông tin
            <select
              aria-label={`Chèn ô vào điều ${index + 1}`}
              className="max-w-full rounded-lg border border-slate-200 bg-white p-2"
              value=""
              disabled={disabled}
              onChange={(event) => {
                if (event.target.value)
                  update(index, {
                    body: `${section.body} {{${event.target.value}}}`,
                  });
              }}
            >
              <option value="">Chọn ô cần chèn…</option>
              {definition.fields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 grid gap-2 text-sm text-slate-500">
            Hướng dẫn cho trợ lý AI (không in trong hợp đồng)
            <textarea
              maxLength={2000}
              rows={2}
              disabled={disabled}
              className={templateInputClass}
              value={section.guidance ?? ""}
              onChange={(event) =>
                update(index, { guidance: event.target.value })
              }
            />
          </label>
        </section>
      ))}
      <Button
        variant="outline"
        disabled={disabled || definition.sections.length >= 20}
        onClick={() =>
          onChange({
            ...definition,
            sections: [
              ...definition.sections,
              {
                key: `section_${crypto.randomUUID().replaceAll("-", "")}`,
                title: "Điều khoản mới",
                body: "Nội dung các bên thỏa thuận.",
              },
            ],
          })
        }
      >
        <Plus size={16} /> Thêm điều khoản
      </Button>
    </div>
  );
}
