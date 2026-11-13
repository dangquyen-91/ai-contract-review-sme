"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

function withSuggestions(value: string, suggestions: string[], selected: string[]) {
  const custom = parts(value).filter((part) => !suggestions.includes(part));
  return [...suggestions.filter((label) => selected.includes(label)), ...custom].join(", ");
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
  const selected = parts(value).filter((part) => suggestions.includes(part));
  return (
    <Collapsible open={expanded} onOpenChange={(next) => setOpen(next || Boolean(value))} className="rounded-lg border border-border">
      <CollapsibleTrigger
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-left text-ui font-semibold text-card-foreground hover:bg-muted/40 disabled:cursor-default"
      >
        <span>
          Muốn AI chú ý điều gì?{" "}
          <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-3.5 pb-3.5 pt-3">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={2}
          value={selected}
          disabled={disabled}
          aria-label="Gợi ý trọng tâm"
          onValueChange={(next) => onChange(withSuggestions(value, suggestions, next))}
          className="w-full flex-wrap"
        >
          {suggestions.map((label) => (
            <ToggleGroupItem
              key={label}
              value={label}
              className="rounded-full px-3 text-ui-meta data-[state=on]:border-primary data-[state=on]:font-semibold data-[state=on]:text-primary"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label htmlFor={`${id}-focus`} className="sr-only">Trọng tâm rà soát</label>
        <Textarea
          id={`${id}-focus`}
          aria-describedby={`${id}-hint`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Hoặc tự mô tả, ví dụ: kiểm tra kỹ điều khoản phạt khi nghỉ việc trước hạn"
          maxLength={1000}
          disabled={disabled}
          rows={3}
          className="mt-3 text-ui"
        />
        <p id={`${id}-hint`} className="mb-0 mt-1.5 text-ui-meta leading-5 text-muted-foreground">
          AI vẫn rà soát toàn bộ hợp đồng, và chú ý hơn tới các phần bạn chọn khi tóm tắt và đánh giá rủi ro.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
