"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraftList } from "@/hooks/contract-drafts/use-contract-drafts";
import type { AuthUser } from "@/types/auth";
import type { ContractTemplate } from "@/types/contract-drafts";
import { DraftListRow } from "./draft-list-row";

export function DraftHistoryDialog({
  open,
  onOpenChange,
  user,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser;
  templates: ContractTemplate[];
}) {
  const [page, setPage] = useState(1);
  const drafts = useDraftList(page);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 pr-14">
          <div>
            <DialogTitle>
              {user.role === "owner" ? "Lịch sử soạn thảo trong tổ chức" : "Lịch sử soạn thảo"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {drafts.data?.total ?? 0} bản nháp · tự cập nhật mỗi phút
            </DialogDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void drafts.refetch()}>
            Làm mới
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {drafts.isLoading ? (
            <p role="status" className="p-8 text-sm text-slate-500">
              Đang tải bản nháp…
            </p>
          ) : drafts.error ? (
            <p role="alert" className="p-8 text-sm text-red-600">
              {drafts.error.message}
            </p>
          ) : !drafts.data?.items.length ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto mb-3 text-slate-300" size={32} aria-hidden="true" />
              <h3 className="font-medium">Chưa có bản nháp</h3>
              <p className="mt-2 text-sm text-slate-500">
                Tạo mới từ kho mẫu hoặc tải lên hợp đồng để bắt đầu.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {drafts.data.items.map((draft) => (
                <DraftListRow
                  key={draft.id}
                  draft={draft}
                  templateName={templates.find((template) => template.code === draft.templateCode)?.name}
                  userId={user.id}
                  onPinned={() => setPage(1)}
                  onDeleted={() => {
                    if (drafts.data?.items.length === 1 && page > 1) setPage(page - 1);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
        {drafts.data && drafts.data.pages > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm">
            <span>
              Trang {page}/{drafts.data.pages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Trước
              </Button>
              <Button size="sm" variant="outline" disabled={page >= drafts.data.pages} onClick={() => setPage(page + 1)}>
                Sau
              </Button>
            </div>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
