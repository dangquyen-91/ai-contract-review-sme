"use client";

import { Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalSourceUploadActions({ pending, previewed, saveLabel, onCancel }: {
  pending: boolean;
  previewed: boolean;
  saveLabel: string;
  onCancel: () => void;
}) {
  const ActionIcon = previewed ? Check : Eye;
  return <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
    <Button variant="outline" disabled={pending} onClick={onCancel}>Hủy</Button>
    <Button type="submit" loading={pending} className="min-w-48">
      {!pending && <ActionIcon aria-hidden="true" />}
      {pending ? previewed ? "Đang lưu tài liệu…" : "Đang xem trước…" : previewed ? saveLabel : "Xem trước tài liệu"}
    </Button>
  </div>;
}
