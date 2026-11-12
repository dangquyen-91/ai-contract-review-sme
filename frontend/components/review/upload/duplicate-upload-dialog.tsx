"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { routes } from "@/config/routes";
import type { DuplicateUpload } from "@/hooks/review/use-review-workflow";

function formatUploadedAt(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function DuplicateUploadDialog({
  duplicate,
  busy,
  onDismiss,
  onUploadAnyway,
}: {
  duplicate: DuplicateUpload;
  busy: boolean;
  onDismiss: () => void;
  onUploadAnyway: () => void;
}) {
  const { match, file } = duplicate;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onDismiss();
      }}
    >
      <DialogContent busy={busy}>
        <DialogHeader>
          <DialogTitle>Tệp này đã được tải lên trước đó</DialogTitle>
          <DialogDescription>
            “{file.name}” giống hệt phiên bản {match.versionNumber} của hợp đồng đã có.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-[color:var(--line)] bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="m-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">{match.title}</p>
          <p className="m-0 mt-1">
            Phiên bản {match.versionNumber} · Tải lên ngày {formatUploadedAt(match.uploadedAt)}
          </p>
        </div>
        <p className="m-0 text-sm leading-6 text-slate-600">
          Nếu đây là bản đã chỉnh sửa, hãy chọn tệp mới và tải lên làm phiên bản mới của hợp đồng đó.
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" disabled={busy} onClick={onUploadAnyway}>
            Vẫn tạo hợp đồng mới
          </Button>
          <Button asChild disabled={busy}>
            <Link href={routes.contract(match.contractId)} onClick={onDismiss}>
              Mở hợp đồng đã có
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
