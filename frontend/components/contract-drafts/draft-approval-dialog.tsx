"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DraftApprovalDialog({
  title,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent busy={busy}>
        <DialogHeader>
          <DialogTitle>Hoàn tất hợp đồng?</DialogTitle>
          <DialogDescription>
            {title}. Sau khi hoàn tất, nội dung sẽ được khóa để giữ nguyên khi tải
            Word/PDF. Bạn có thể tự hoàn tất, không cần Owner
            phê duyệt.
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <input
            type="checkbox"
            className="mt-1"
            checked={checked}
            disabled={busy}
            onChange={(event) => setChecked(event.target.checked)}
          />
          Tôi đã kiểm tra thông tin các bên, số tiền, thời hạn và nội dung điều
          khoản của bản nháp này.
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Quay lại
          </Button>
          <Button
            disabled={!checked || busy}
            loading={busy}
            onClick={onConfirm}
          >
            Xác nhận hoàn tất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
