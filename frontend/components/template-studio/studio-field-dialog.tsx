"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/contract-drafts/money-input";
import type { TemplateField } from "@/types/contract-drafts";

export function StudioFieldDialog({
  field,
  value,
  onClose,
  onSave,
}: {
  field: TemplateField;
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{field.label}</DialogTitle>
          <DialogDescription>
            Thông tin này được cập nhật đồng thời ở những vị trí tương ứng trên
            mẫu.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(text.trim());
          }}
        >
          {field.kind === "textarea" ? (
            <textarea
              aria-label={field.label}
              className="min-h-32 rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-blue-400"
              autoFocus
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
              placeholder={field.placeholder}
            />
          ) : field.options ? (
            <select
              aria-label={field.label}
              className="rounded-xl border border-slate-200 p-3 text-sm"
              value={text}
              onChange={(event) => setText(event.target.value)}
            >
              <option value="">Chọn thông tin</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.kind === "number" ? (
            <MoneyInput
              id={`studio-value-${field.key}`}
              ariaLabel={field.label}
              value={text}
              onValueChange={setText}
            />
          ) : (
            <Input
              autoFocus
              aria-label={field.label}
              type={field.kind === "date" ? "date" : "text"}
              value={text}
              maxLength={4000}
              onChange={(event) => setText(event.target.value)}
              placeholder={field.placeholder}
            />
          )}
          {field.help && (
            <p className="text-xs leading-5 text-slate-500">{field.help}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">Lưu thông tin</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
