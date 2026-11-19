"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { templateInputClass } from "@/config/managed-templates";
import type { TemplateDefinition } from "@/types/managed-templates";

export function TemplateFieldsEditor({
  definition,
  onChange,
  disabled,
}: {
  definition: TemplateDefinition;
  onChange: (value: TemplateDefinition) => void;
  disabled: boolean;
}) {
  function update(
    key: string,
    patch: Partial<TemplateDefinition["fields"][number]>,
  ) {
    onChange({
      ...definition,
      fields: definition.fields.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    });
  }
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-500">
        Giữ các ô nghiệp vụ nền của từng loại hợp đồng. Ô bổ sung cần được chèn
        vào nội dung điều khoản trước khi lưu.
      </p>
      {definition.fields.map((field) => (
        <div key={field.key} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <label className="grid flex-1 gap-2 text-sm font-medium">
              Tên hiển thị
              <input
                className={templateInputClass}
                maxLength={200}
                disabled={disabled}
                value={field.label}
                onChange={(event) =>
                  update(field.key, { label: event.target.value })
                }
              />
            </label>
            {field.key.startsWith("custom_") && (
              <Button
                aria-label={`Xóa ô ${field.label}`}
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...definition,
                    fields: definition.fields.filter(
                      (item) => item.key !== field.key,
                    ),
                  })
                }
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-slate-500">
              Gợi ý nhập
              <input
                className={templateInputClass}
                maxLength={500}
                disabled={disabled}
                value={field.placeholder ?? ""}
                onChange={(event) =>
                  update(field.key, { placeholder: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-xs text-slate-500">
              Giá trị mặc định
              {field.options ? (
                <select
                  className={templateInputClass}
                  disabled={disabled}
                  value={field.defaultValue ?? ""}
                  onChange={(event) =>
                    update(field.key, { defaultValue: event.target.value })
                  }
                >
                  <option value="">Không điền sẵn</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={templateInputClass}
                  disabled={disabled}
                  maxLength={4000}
                  value={field.defaultValue ?? ""}
                  onChange={(event) =>
                    update(field.key, { defaultValue: event.target.value })
                  }
                />
              )}
            </label>
          </div>
          {field.key.startsWith("custom_") && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <label>
                Loại ô{" "}
                <select
                  className="rounded border border-slate-200 p-1"
                  value={field.kind}
                  disabled={disabled}
                  onChange={(event) =>
                    update(field.key, {
                      kind: event.target.value as typeof field.kind,
                    })
                  }
                >
                  <option value="text">Văn bản ngắn</option>
                  <option value="textarea">Văn bản dài</option>
                  <option value="number">Số tiền / số</option>
                  <option value="date">Ngày</option>
                </select>
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={disabled}
                  onChange={(event) =>
                    update(field.key, { required: event.target.checked })
                  }
                />
                Bắt buộc điền
              </label>
            </div>
          )}
        </div>
      ))}
      <Button
        variant="outline"
        disabled={disabled || definition.fields.length >= 64}
        onClick={() =>
          onChange({
            ...definition,
            fields: [
              ...definition.fields,
              {
                key: `custom_${crypto.randomUUID().replaceAll("-", "")}`,
                label: "Thông tin bổ sung",
                kind: "text",
                required: false,
                group: "terms",
              },
            ],
          })
        }
      >
        <Plus size={16} /> Thêm ô thông tin
      </Button>
    </div>
  );
}
