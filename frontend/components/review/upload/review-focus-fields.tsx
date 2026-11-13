"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const focusSuggestions: Record<string, string[]> = {
  labor: ["Thử việc", "Tiền lương và phụ cấp", "Thời giờ làm việc", "Chấm dứt hợp đồng", "Bảo mật và cạnh tranh"],
  sales: ["Thanh toán", "Giao nhận hàng", "Bảo hành", "Phạt vi phạm", "Chấm dứt hợp đồng"],
  service: ["Phạm vi dịch vụ", "Thanh toán", "Nghiệm thu", "Phạt vi phạm", "Chấm dứt hợp đồng"],
  office_lease: ["Giá thuê và điều chỉnh giá", "Tiền đặt cọc", "Sửa chữa, cải tạo", "Chấm dứt hợp đồng"],
  housing_purchase: ["Tiến độ thanh toán", "Bàn giao nhà", "Cấp giấy chứng nhận", "Tiền đặt cọc", "Phạt chậm tiến độ"],
  life_insurance: ["Quyền lợi bảo hiểm", "Điều khoản loại trừ", "Phí bảo hiểm", "Hủy hợp đồng"],
};
const defaultSuggestions = ["Thanh toán", "Phạt vi phạm", "Chấm dứt hợp đồng", "Bảo mật"];

function parts(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function toggle(value: string, label: string) {
  const current = parts(value);
  const next = current.includes(label) ? current.filter((part) => part !== label) : [...current, label];
  return next.join(", ");
}

type ReviewFocusFieldsProps = {
  id: string;
  value: string;
  disabled: boolean;
  contractType?: string;
  onChange: (value: string) => void;
};

export function ReviewFocusFields({ id, value, disabled, contractType, onChange }: ReviewFocusFieldsProps) {
  const [open, setOpen] = useState(false);
  const expanded = open || Boolean(value);
  const suggestions = (contractType && focusSuggestions[contractType]) || defaultSuggestions;
  const selected = parts(value);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-focus-panel`}
        onClick={() => setOpen(!expanded)}
        disabled={disabled || Boolean(value)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-left text-ui font-semibold text-card-foreground hover:bg-muted/40 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span>
          Muốn AI chú ý điều gì?{" "}
          <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div id={`${id}-focus-panel`} className="border-t border-border px-3.5 pb-3.5 pt-3">
          <div role="group" aria-label="Gợi ý trọng tâm" className="flex flex-wrap gap-2">
            {suggestions.map((label) => {
              const active = selected.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => onChange(toggle(value, label))}
                  className={`min-h-8 rounded-full border px-3 py-1 text-ui-meta transition-colors disabled:opacity-60 ${active ? "border-primary bg-accent font-semibold text-primary" : "border-border bg-card text-card-foreground hover:border-primary"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <label htmlFor={`${id}-focus`} className="sr-only">Trọng tâm rà soát</label>
          <textarea
            id={`${id}-focus`}
            aria-describedby={`${id}-hint`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Hoặc tự mô tả, ví dụ: kiểm tra kỹ điều khoản phạt khi nghỉ việc trước hạn"
            maxLength={1000}
            disabled={disabled}
            rows={3}
            className="mt-3 w-full resize-y rounded-[9px] border border-input bg-card p-3 text-ui leading-[1.6] text-card-foreground placeholder:text-muted-foreground placeholder:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          />
          <p id={`${id}-hint`} className="mb-0 mt-1.5 text-ui-meta leading-5 text-muted-foreground">
            AI vẫn rà soát toàn bộ hợp đồng, và chú ý hơn tới các phần bạn chọn khi tóm tắt và đánh giá rủi ro.
          </p>
        </div>
      )}
    </div>
  );
}
