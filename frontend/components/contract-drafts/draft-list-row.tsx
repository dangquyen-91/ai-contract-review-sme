"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useDraftListActions } from "@/hooks/contract-drafts/use-draft-list-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DraftSummary } from "@/types/contract-drafts";
import { DraftStatusBadge } from "./draft-status";

export function DraftListRow({
  draft,
  templateName,
  userId,
  onPinned,
  onDeleted,
}: {
  draft: DraftSummary;
  templateName?: string;
  userId: string;
  onPinned: () => void;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    pinned,
    canDelete,
    busy,
    deleteError,
    clearDeleteError,
    pin,
    remove,
  } = useDraftListActions(draft, onPinned, onDeleted);
  return (
    <li
      data-draft-id={draft.id}
      className={`flex items-center gap-2 px-3 py-1.5 transition-colors sm:px-5 ${pinned ? "bg-blue-50/45" : "hover:bg-slate-50"}`}
    >
      <Link
        href={`/contract-drafts/${draft.id}`}
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-1 py-4 sm:pr-3"
      >
        <div className="min-w-0">
          <p className="flex items-start gap-2 text-sm font-semibold">
            {pinned && (
              <Pin
                size={14}
                className="mt-0.5 shrink-0 fill-blue-100 text-blue-600"
                aria-label="Đã ghim"
              />
            )}
            <span className="break-words">{draft.title}</span>
          </p>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            {templateName} ·{" "}
            {draft.createdBy === userId ? "Bạn tạo" : "Thành viên tạo"} ·{" "}
            {new Date(draft.updatedAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-4">
          <DraftStatusBadge status={draft.status} />
          <ArrowRight size={16} className="text-slate-400" aria-hidden="true" />
        </span>
      </Link>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={busy}
            aria-label={`Thao tác bản nháp: ${draft.title}`}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <MoreHorizontal size={19} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-[80] min-w-52 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl"
          >
            <DropdownMenu.Item
              onSelect={() => void pin()}
              disabled={busy}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:bg-blue-50 data-[disabled]:opacity-40"
            >
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
              {pinned ? "Bỏ ghim" : "Ghim lên đầu"}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
            <DropdownMenu.Item
              disabled={!canDelete || busy}
              onSelect={() => {
                clearDeleteError();
                setConfirmDelete(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-red-600 outline-none focus:bg-red-50 data-[disabled]:opacity-40"
            >
              <Trash2 size={15} />
              Xóa bản nháp
            </DropdownMenu.Item>
            {!canDelete && (
              <p className="max-w-56 px-3 pb-2 text-[10px] leading-4 text-slate-400">
                Chỉ xóa hợp đồng còn ở trạng thái bản nháp.
              </p>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!busy) setConfirmDelete(open);
        }}
      >
        <DialogContent busy={busy}>
          <DialogHeader>
            <DialogTitle>Xóa bản nháp?</DialogTitle>
            <DialogDescription>
              Bản nháp sẽ được xóa khỏi danh sách. Bạn có chắc muốn tiếp tục?
            </DialogDescription>
          </DialogHeader>
          <p className="break-words rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
            {draft.title}
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={busy}
              loading={busy}
              onClick={() => {
                void remove().then((deleted) => {
                  if (deleted) setConfirmDelete(false);
                });
              }}
            >
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
